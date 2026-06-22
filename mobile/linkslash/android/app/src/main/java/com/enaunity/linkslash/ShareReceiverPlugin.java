package com.enaunity.linkslash;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {
    private static final String PREF_NAME = "linkslash_share";
    private static final String KEY_TEXT = "pending_text";
    private static final String KEY_TITLE = "pending_title";
    private static final String KEY_HTML = "pending_html";
    private static final String KEY_MIME = "pending_mime";
    private static final String KEY_FROM = "pending_from";
    private static final String KEY_KIND = "pending_kind";
    private static final int MAX_TEXT_BYTES = 5 * 1024 * 1024;

    public static void storeShareIntent(android.content.Context ctx, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return;

        String type = intent.getType();
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        String html = intent.getStringExtra(Intent.EXTRA_HTML_TEXT);
        String from = intent.getPackage();
        String kind = "url";

        ClipData clip = intent.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                ClipData.Item item = clip.getItemAt(i);
                if (html == null && item.getHtmlText() != null) {
                    html = item.getHtmlText();
                }
                if (text == null && item.getText() != null) {
                    text = item.getText().toString();
                }
                if (item.getUri() != null) {
                    String fileText = readSharedUri(ctx, item.getUri(), type);
                    if (fileText != null && !fileText.isEmpty()) {
                        text = fileText;
                        kind = looksLikeWhatsAppExport(fileText) ? "whatsapp_export" : "file";
                    }
                }
            }
        }

        Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (stream != null) {
            String fileText = readSharedUri(ctx, stream, type);
            if (fileText != null && !fileText.isEmpty()) {
                text = fileText;
                kind = looksLikeWhatsAppExport(fileText) ? "whatsapp_export" : "file";
            } else if (text == null) {
                text = stream.toString();
                kind = "file";
            }
        }

        if (text != null && looksLikeWhatsAppExport(text)) {
            kind = "whatsapp_export";
        }

        if (text == null && html == null && title == null) return;

        ctx.getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TEXT, text != null ? text : "")
            .putString(KEY_TITLE, title != null ? title : "")
            .putString(KEY_HTML, html != null ? html : "")
            .putString(KEY_MIME, type != null ? type : "")
            .putString(KEY_FROM, from != null ? from : "")
            .putString(KEY_KIND, kind)
            .apply();
    }

    private static boolean looksLikeWhatsAppExport(String text) {
        if (text == null || text.length() < 20) return false;
        return text.contains(" - ") &&
            (text.contains("WhatsApp") ||
                text.matches("(?m)^\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}.*-.*:") ||
                text.matches("(?m)^\\[\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}.*\\].*:"));
    }

    private static String readSharedUri(android.content.Context ctx, Uri uri, String mime) {
        try {
            String path = uri.getLastPathSegment() != null ? uri.getLastPathSegment().toLowerCase() : "";
            boolean isZip = (mime != null && mime.contains("zip")) || path.endsWith(".zip");
            InputStream input = ctx.getContentResolver().openInputStream(uri);
            if (input == null) return null;
            if (isZip) {
                return extractTxtFromZip(input);
            }
            return readStreamLimited(input);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String extractTxtFromZip(InputStream input) throws Exception {
        ZipInputStream zis = new ZipInputStream(input);
        ZipEntry entry;
        String fallback = null;
        while ((entry = zis.getNextEntry()) != null) {
            if (entry.isDirectory()) continue;
            String name = entry.getName() != null ? entry.getName().toLowerCase() : "";
            if (!name.endsWith(".txt")) continue;
            String content = readStreamLimited(zis);
            if (name.contains("chat") || name.startsWith("_")) {
                zis.close();
                return content;
            }
            if (fallback == null) fallback = content;
        }
        zis.close();
        return fallback;
    }

    private static String readStreamLimited(InputStream input) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(data, 0, data.length)) != -1) {
            total += read;
            if (total > MAX_TEXT_BYTES) break;
            buffer.write(data, 0, read);
        }
        input.close();
        return buffer.toString(StandardCharsets.UTF_8.name());
    }

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        android.content.SharedPreferences prefs =
            getContext().getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE);
        String text = prefs.getString(KEY_TEXT, "");
        String title = prefs.getString(KEY_TITLE, "");
        String html = prefs.getString(KEY_HTML, "");
        String mime = prefs.getString(KEY_MIME, "");
        String from = prefs.getString(KEY_FROM, "");
        String kind = prefs.getString(KEY_KIND, "url");

        if (text.isEmpty() && title.isEmpty() && html.isEmpty()) {
            call.resolve(new JSObject());
            return;
        }

        JSObject ret = new JSObject();
        ret.put("text", text);
        ret.put("title", title);
        ret.put("html", html);
        ret.put("mimeType", mime);
        ret.put("sharedFrom", from);
        ret.put("kind", kind);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        getContext().getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE).edit().clear().apply();
        call.resolve();
    }
}
