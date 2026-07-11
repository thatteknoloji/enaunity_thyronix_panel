# Gradle Release Signing

`android/app/build.gradle` dosyasının sonuna aşağıdaki snippet'i ekleyin:

```gradle
// LinkSlash release signing (keystore.properties varsa)
def keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    def keystoreProps = new Properties()
    keystoreProps.load(new FileInputStream(keystorePropsFile))
    android {
        signingConfigs {
            release {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.release
                minifyEnabled false
            }
        }
    }
}
```

Sonra:
```bash
cd android && ./gradlew bundleRelease
```

Çıktı: `app/build/outputs/bundle/release/app-release.aab`
