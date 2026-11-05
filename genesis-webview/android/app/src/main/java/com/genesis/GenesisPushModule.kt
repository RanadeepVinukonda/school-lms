package com.genesis

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.google.firebase.messaging.FirebaseMessaging

class GenesisPushModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    init {
        GenesisPushState.listener = { link ->
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_ACTION, link)
            }
        }
        GenesisPushState.tokenListener = { token ->
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_TOKEN, token)
            }
        }
    }

    override fun getName(): String = "GenesisPush"

    @ReactMethod
    fun getToken(promise: Promise) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                promise.resolve(task.result)
            } else {
                promise.reject("E_FCM_TOKEN", task.exception)
            }
        }
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(true)
            return
        }
        if (ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(true)
            return
        }

        val activity = reactContext.currentActivity
        if (activity !is PermissionAwareActivity) {
            promise.reject("E_NO_ACTIVITY", "No permission-aware activity")
            return
        }

        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            NOTIFICATION_REQUEST_CODE,
            PermissionListener { requestCode, _, grantResults ->
                if (requestCode == NOTIFICATION_REQUEST_CODE) {
                    promise.resolve(
                        grantResults.isNotEmpty() &&
                            grantResults[0] == PackageManager.PERMISSION_GRANTED,
                    )
                    true
                } else {
                    false
                }
            },
        )
    }

    @ReactMethod
    fun getInitialLink(promise: Promise) {
        promise.resolve(GenesisPushState.initialLink)
        GenesisPushState.initialLink = null
    }

    companion object {
        private const val EVENT_ACTION = "GenesisPushAction"
        private const val EVENT_TOKEN = "GenesisPushToken"
        private const val NOTIFICATION_REQUEST_CODE = 90210
    }
}
