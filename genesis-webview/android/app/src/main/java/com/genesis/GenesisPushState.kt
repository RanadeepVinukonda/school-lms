package com.genesis

/**
 * Small bridge between MainActivity (which receives notification taps) and the
 * React Native push module that forwards the deep link into the WebView.
 */
object GenesisPushState {
    @Volatile
    var initialLink: String? = null

    @Volatile
    var listener: ((String) -> Unit)? = null

    @Volatile
    var tokenListener: ((String) -> Unit)? = null

    fun deliverToken(token: String?) {
        if (token.isNullOrBlank()) return
        tokenListener?.invoke(token)
    }

    fun deliver(link: String?) {
        if (link.isNullOrBlank()) return
        val target = listener
        if (target != null) {
            target(link)
        } else {
            initialLink = link
        }
    }
}
