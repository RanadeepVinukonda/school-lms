package com.genesis

import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class GenesisOpenWithModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "GenesisOpenWith"

  @ReactMethod
  fun openFile(filename: String, mimeType: String, base64Content: String, promise: Promise) {
    try {
      val bytes = Base64.decode(base64Content, Base64.DEFAULT)
      val safeName = sanitizeFilename(filename)
      val dir = File(reactApplicationContext.cacheDir, "shared_files").apply { mkdirs() }
      val file = File(dir, safeName)
      file.writeBytes(bytes)

      val uri: Uri = FileProvider.getUriForFile(
        reactApplicationContext,
        "${reactApplicationContext.packageName}.fileprovider",
        file
      )

      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mimeType.ifBlank { "application/octet-stream" })
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      // Resolve to an explicit chooser so the system "Open With" dialog appears.
      val chooser = Intent.createChooser(intent, "Open With").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(chooser)
      promise.resolve(mapOf("status" to "shared"))
    } catch (e: Exception) {
      promise.reject("OPEN_FAILED", e.message ?: "Failed to open file", e)
    }
  }

  private fun sanitizeFilename(name: String): String {
    val cleaned = name.replace(Regex("[^A-Za-z0-9._\\-]"), "_")
    return cleaned.ifBlank { "file" }
  }
}
