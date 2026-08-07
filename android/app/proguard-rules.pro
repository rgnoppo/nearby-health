# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Debugging hygiene -------------------------------------------------
# Strip line-number/source-file info from the shipped APK so stack traces
# can't be used to reconstruct original file/class layout. Re-enable
# temporarily (uncomment SourceFile,LineNumberTable) only if you need to
# symbolicate a crash report locally with the matching mapping.txt.
-renamesourcefileattribute SourceFile

# Remove Android logging calls from release builds - nothing printed via
# Log.* ships in the APK, so log statements can't leak internal state.
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}

# --- Capacitor / Cordova plugin bridge ---------------------------------
# Capacitor and Cordova plugins are invoked via reflection (annotations +
# the JS <-> native bridge), so their public API must survive shrinking/
# obfuscation or the bridge breaks at runtime.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PluginMethod public *;
}
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends org.apache.cordova.CordovaPlugin

# --- WebView JS interface ------------------------------------------------
# Only needed if a native @JavascriptInterface bridge class is ever added
# outside Capacitor's own bridge (which is already covered above). Kept here
# as a template so a future addition doesn't silently break under
# obfuscation.
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}
