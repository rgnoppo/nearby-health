package eg.nearbyhealth.clinics;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // chrome://inspect remote debugging must only ever be reachable on a
        // debug build. In release it stays off, so the WebView (and its DOM,
        // JS state, network calls, and any Supabase session in memory) can't
        // be attached to and inspected from a connected computer.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }
}
