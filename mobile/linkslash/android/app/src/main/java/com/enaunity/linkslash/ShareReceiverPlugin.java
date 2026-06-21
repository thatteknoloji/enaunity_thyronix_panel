package com.enaunity.linkslash;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.util.JSONUtils;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {
    private static final String PREF_NAME = "linkslash_share";
    private static final String KEY_TEXT = "pending_text";
    private static final String KEY_TITLE = "pending_title";
    private static final String KEY_MIME = "pending_mime";
    private static final String KEY_FROM = "pending_from";

    public static void storeShareIntent(android.content.Context ctx, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return;

        String type = intent.getType();
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        String from = intent.getPackage();

        if (text == null && intent.getParcelableExtra(Intent.EXTRA_STREAM) instanceof Uri) {
            Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            text = stream != null ? stream.toString() : null;
        }

        if (text == null && title == null) return;

        ctx.getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TEXT, text != null ? text : "")
            .putString(KEY_TITLE, title != null ? title : "")
            .putString(KEY_MIME, type != null ? type : "")
            .putString(KEY_FROM, from != null ? from : "")
            .apply();
    }

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE);
        String text = prefs.getString(KEY_TEXT, "");
        String title = prefs.getString(KEY_TITLE, "");
        String mime = prefs.getString(KEY_MIME, "");
        String from = prefs.getString(KEY_FROM, "");

        if (text.isEmpty() && title.isEmpty()) {
            call.resolve(new JSObject());
            return;
        }

        JSObject ret = new JSObject();
        ret.put("text", text);
        ret.put("title", title);
        ret.put("mimeType", mime);
        ret.put("sharedFrom", from);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        getContext().getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE).edit().clear().apply();
        call.resolve();
    }
}
