package com.avangersblack.game

import android.opengl.GLSurfaceView
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.avangersblack.game.engine.OpenGLWorldRenderer
import com.avangersblack.game.engine.PuzzleAndStoryEngine
import com.avangersblack.game.model.GameScreen
import com.avangersblack.game.model.GameSettings
import com.avangersblack.game.ui.AvangersBlackOverlay
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

class MainActivity : ComponentActivity() {

    private lateinit var storyEngine: PuzzleAndStoryEngine
    private var settings = GameSettings()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        storyEngine = PuzzleAndStoryEngine(this).apply { loadState() }

        setContent {
            var currentScreen by remember { mutableStateOf(GameScreen.MENU) }

            val renderer = remember {
                OpenGLWorldRenderer(
                    getCharacter = { storyEngine.character },
                    getSettings = { settings },
                    getPlayerPos = {
                        Triple(storyEngine.player.x, storyEngine.player.z, storyEngine.player.yawRad)
                    },
                    isCreatorMode = { currentScreen == GameScreen.CREATOR }
                )
            }

            Box(modifier = Modifier.fillMaxSize()) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        GLSurfaceView(ctx).apply {
                            setEGLContextClientVersion(3)
                            setRenderer(renderer)
                            renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
                        }
                    }
                )

                AvangersBlackOverlay(
                    engine = storyEngine,
                    screen = currentScreen,
                    onScreenChange = { currentScreen = it },
                    onMoveJoystick = { jx, jz ->
                        val speed = if (storyEngine.player.crouching) 0.14f else 0.24f
                        val sinY = sin(renderer.cameraYaw)
                        val cosY = cos(renderer.cameraYaw)
                        val dx = (-sinY * -jz + cosY * jx) * speed
                        val dz = (-cosY * -jz - sinY * jx) * speed
                        val nextYaw = if (dx * dx + dz * dz > 0.0001f) atan2(dx, dz) else storyEngine.player.yawRad
                        storyEngine.player = storyEngine.player.copy(
                            x = (storyEngine.player.x + dx).coerceIn(-25f, 25f),
                            z = (storyEngine.player.z + dz).coerceIn(-21f, 22f),
                            yawRad = nextYaw
                        )
                    },
                    onCameraDrag = { dx, dy ->
                        renderer.cameraYaw -= dx * 0.006f
                        renderer.cameraPitch = (renderer.cameraPitch + dy * 0.004f).coerceIn(0.12f, 0.85f)
                    }
                )
            }
        }
    }
}
