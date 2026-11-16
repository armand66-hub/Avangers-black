package com.avangersblack.game.engine

import android.graphics.Color
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import com.avangersblack.game.model.CharacterProfile
import com.avangersblack.game.model.GameSettings
import com.avangersblack.game.model.GraphicsQuality
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.cos
import kotlin.math.sin

/**
 * Moteur de rendu 3D natif OpenGL ES 3.0 pour Android.
 * Gère le personnage personnalisable 3D, les bâtiments de Port-Brume / Galeries,
 * le cycle jour/nuit, l'éclairage directionnel et la caméra troisième personne.
 */
class OpenGLWorldRenderer(
    private val getCharacter: () -> CharacterProfile,
    private val getSettings: () -> GameSettings,
    private val getPlayerPos: () -> Triple<Float, Float, Float>,
    private val isCreatorMode: () -> Boolean
) : GLSurfaceView.Renderer {

    private var program = 0
    private var cubeBuffer: FloatBuffer? = null

    private val projMatrix = FloatArray(16)
    private val viewMatrix = FloatArray(16)
    private val modelMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val tempMatrix = FloatArray(16)

    @Volatile var cameraYaw = 0.4f
    @Volatile var cameraPitch = 0.35f
    private var creatorSpin = 0f

    private val vertexShaderCode = """
        #version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        uniform mat4 uMVP;
        uniform mat4 uModel;
        out vec3 vNormal;
        out vec3 vWorldPos;
        void main() {
            vec4 wp = uModel * vec4(aPosition, 1.0);
            vWorldPos = wp.xyz;
            vNormal = mat3(uModel) * aNormal;
            gl_Position = uMVP * vec4(aPosition, 1.0);
        }
    """.trimIndent()

    private val fragmentShaderCode = """
        #version 300 es
        precision highp float;
        in vec3 vNormal;
        in vec3 vWorldPos;
        uniform vec3 uColor;
        uniform vec3 uLightDir;
        uniform float uDaylight;
        out vec4 fragColor;
        void main() {
            vec3 n = normalize(vNormal);
            float diff = max(dot(n, normalize(uLightDir)), 0.0);
            vec3 ambient = vec3(0.18, 0.21, 0.27) * (0.65 + uDaylight * 0.5);
            vec3 lit = uColor * (ambient + diff * (0.75 + uDaylight * 0.45));
            float dist = length(vWorldPos.xz);
            float fog = clamp((dist - 18.0) / 42.0, 0.0, 0.85);
            vec3 fogCol = mix(vec3(0.04, 0.05, 0.08), vec3(0.24, 0.31, 0.40), uDaylight);
            fragColor = vec4(mix(lit, fogCol, fog), 1.0);
        }
    """.trimIndent()

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
        program = createProgram(vertexShaderCode, fragmentShaderCode)
        cubeBuffer = buildUnitCubeBuffer()
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        val settings = getSettings()
        val scale = when (settings.quality) {
            GraphicsQuality.LOW -> 0.65f
            GraphicsQuality.MEDIUM -> 0.85f
            GraphicsQuality.HIGH -> 1.0f
            GraphicsQuality.UHD_4K -> 1.0f // Native 4K panel support if device display >= 3840x2160
        }
        val vw = (width * scale).toInt().coerceAtLeast(1)
        val vh = (height * scale).toInt().coerceAtLeast(1)
        GLES30.glViewport(0, 0, vw, vh)
        Matrix.perspectiveM(projMatrix, 0, 56f, width.toFloat() / height.coerceAtLeast(1), 0.1f, 120f)
    }

    override fun onDrawFrame(gl: GL10?) {
        val settings = getSettings()
        val daylight = ((sin((settings.timeOfDay / 24f) * Math.PI * 2.0 - Math.PI / 2.0) + 0.3) / 1.3)
            .toFloat().coerceIn(0f, 1f)

        GLES30.glClearColor(0.04f + daylight * 0.15f, 0.05f + daylight * 0.18f, 0.09f + daylight * 0.25f, 1f)
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        GLES30.glUseProgram(program)

        val (px, pz, pyaw) = getPlayerPos()
        if (isCreatorMode()) {
            creatorSpin += 0.012f
            Matrix.setLookAtM(viewMatrix, 0, 0f, 1.35f, 3.1f, 0f, 1.05f, 0f, 0f, 1f, 0f)
            drawCharacter(0f, 0f, creatorSpin, daylight)
        } else {
            val camDist = 5.2f
            val cx = px + sin(cameraYaw) * cos(cameraPitch) * camDist
            val cy = 2.1f + sin(cameraPitch) * camDist * 0.65f
            val cz = pz + cos(cameraYaw) * cos(cameraPitch) * camDist
            Matrix.setLookAtM(viewMatrix, 0, cx, cy, cz, px, 1.25f, pz, 0f, 1f, 0f)

            // Ground
            drawBox(0f, -0.05f, 0f, 64f, 0.1f, 64f, 0.11f, 0.12f, 0.15f, daylight)
            // Hangar 4 & Safehouse structures
            drawBox(12f, 3.2f, -15f, 14f, 6.4f, 8f, 0.22f, 0.25f, 0.30f, daylight)
            drawBox(-18f, 3.0f, 6f, 8f, 6.0f, 8f, 0.28f, 0.21f, 0.19f, daylight)
            // 3 Streetlamps
            drawBox(4f, 2.5f, -2f, 0.2f, 5.0f, 0.2f, 0.95f, 0.65f, 0.2f, daylight)
            drawBox(11.5f, 2.5f, -2f, 0.2f, 5.0f, 0.2f, 0.95f, 0.65f, 0.2f, daylight)
            drawBox(18.5f, 2.5f, -2f, 0.2f, 5.0f, 0.2f, 0.95f, 0.65f, 0.2f, daylight)
            // 2 Blue cargo crates
            drawBox(5.5f, 0.6f, -5.4f, 1.4f, 1.2f, 1.4f, 0.12f, 0.32f, 0.50f, daylight)
            drawBox(7.4f, 0.6f, -5.1f, 1.4f, 1.2f, 1.4f, 0.12f, 0.32f, 0.50f, daylight)

            drawCharacter(px, pz, pyaw, daylight)
        }
    }

    private fun drawCharacter(x: Float, z: Float, yaw: Float, daylight: Float) {
        val profile = getCharacter()
        val skin = parseHexColor(profile.skinToneHex)
        val outfit = parseHexColor(profile.outfitColorHex)
        val h = profile.heightScale

        // Legs
        drawRotatedPart(x, 0.42f * h, z, yaw, -0.1f, 0f, 0.14f, 0.84f * h, 0.16f, 0.12f, 0.13f, 0.16f, daylight)
        drawRotatedPart(x, 0.42f * h, z, yaw, 0.1f, 0f, 0.14f, 0.84f * h, 0.16f, 0.12f, 0.13f, 0.16f, daylight)
        // Torso
        drawRotatedPart(x, 1.15f * h, z, yaw, 0f, 0f, 0.40f, 0.56f * h, 0.24f, outfit[0], outfit[1], outfit[2], daylight)
        // Head
        drawRotatedPart(x, 1.58f * h, z, yaw, 0f, 0f, 0.22f, 0.24f, 0.22f, skin[0], skin[1], skin[2], daylight)
    }

    private fun drawBox(
        x: Float, y: Float, z: Float,
        sx: Float, sy: Float, sz: Float,
        r: Float, g: Float, b: Float, daylight: Float
    ) {
        drawRotatedPart(x, y, z, 0f, 0f, 0f, sx, sy, sz, r, g, b, daylight)
    }

    private fun drawRotatedPart(
        x: Float, y: Float, z: Float, yawRad: Float,
        localX: Float, localZ: Float,
        sx: Float, sy: Float, sz: Float,
        r: Float, g: Float, b: Float, daylight: Float
    ) {
        Matrix.setIdentityM(modelMatrix, 0)
        Matrix.translateM(modelMatrix, 0, x, y, z)
        Matrix.rotateM(modelMatrix, 0, Math.toDegrees(yawRad.toDouble()).toFloat(), 0f, 1f, 0f)
        Matrix.translateM(modelMatrix, 0, localX, 0f, localZ)
        Matrix.scaleM(modelMatrix, 0, sx, sy, sz)

        Matrix.multiplyMM(tempMatrix, 0, viewMatrix, 0, modelMatrix, 0)
        Matrix.multiplyMM(mvpMatrix, 0, projMatrix, 0, tempMatrix, 0)

        GLES30.glUniformMatrix4fv(GLES30.glGetUniformLocation(program, "uMVP"), 1, false, mvpMatrix, 0)
        GLES30.glUniformMatrix4fv(GLES30.glGetUniformLocation(program, "uModel"), 1, false, modelMatrix, 0)
        GLES30.glUniform3f(GLES30.glGetUniformLocation(program, "uColor"), r, g, b)
        GLES30.glUniform3f(GLES30.glGetUniformLocation(program, "uLightDir"), 0.5f, 0.8f, 0.4f)
        GLES30.glUniform1f(GLES30.glGetUniformLocation(program, "uDaylight"), daylight)

        val buf = cubeBuffer ?: return
        buf.position(0)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, 24, buf)
        buf.position(3)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 3, GLES30.GL_FLOAT, false, 24, buf)
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES, 0, 36)
    }

    private fun parseHexColor(hex: String): FloatArray {
        return try {
            val c = Color.parseColor(hex)
            floatArrayOf(Color.red(c) / 255f, Color.green(c) / 255f, Color.blue(c) / 255f)
        } catch (_: Exception) {
            floatArrayOf(0.5f, 0.5f, 0.5f)
        }
    }

    private fun createProgram(vsSrc: String, fsSrc: String): Int {
        val vs = GLES30.glCreateShader(GLES30.GL_VERTEX_SHADER).also {
            GLES30.glShaderSource(it, vsSrc)
            GLES30.glCompileShader(it)
        }
        val fs = GLES30.glCreateShader(GLES30.GL_FRAGMENT_SHADER).also {
            GLES30.glShaderSource(it, fsSrc)
            GLES30.glCompileShader(it)
        }
        return GLES30.glCreateProgram().also {
            GLES30.glAttachShader(it, vs)
            GLES30.glAttachShader(it, fs)
            GLES30.glLinkProgram(it)
        }
    }

    private fun buildUnitCubeBuffer(): FloatBuffer {
        val v = floatArrayOf(
            // Front
            -0.5f,-0.5f, 0.5f, 0f,0f,1f,  0.5f,-0.5f, 0.5f, 0f,0f,1f,  0.5f, 0.5f, 0.5f, 0f,0f,1f,
            -0.5f,-0.5f, 0.5f, 0f,0f,1f,  0.5f, 0.5f, 0.5f, 0f,0f,1f, -0.5f, 0.5f, 0.5f, 0f,0f,1f,
            // Back
            -0.5f,-0.5f,-0.5f, 0f,0f,-1f, -0.5f, 0.5f,-0.5f, 0f,0f,-1f,  0.5f, 0.5f,-0.5f, 0f,0f,-1f,
            -0.5f,-0.5f,-0.5f, 0f,0f,-1f,  0.5f, 0.5f,-0.5f, 0f,0f,-1f,  0.5f,-0.5f,-0.5f, 0f,0f,-1f,
            // Top
            -0.5f, 0.5f,-0.5f, 0f,1f,0f, -0.5f, 0.5f, 0.5f, 0f,1f,0f,  0.5f, 0.5f, 0.5f, 0f,1f,0f,
            -0.5f, 0.5f,-0.5f, 0f,1f,0f,  0.5f, 0.5f, 0.5f, 0f,1f,0f,  0.5f, 0.5f,-0.5f, 0f,1f,0f,
            // Bottom
            -0.5f,-0.5f,-0.5f, 0f,-1f,0f,  0.5f,-0.5f,-0.5f, 0f,-1f,0f,  0.5f,-0.5f, 0.5f, 0f,-1f,0f,
            -0.5f,-0.5f,-0.5f, 0f,-1f,0f,  0.5f,-0.5f, 0.5f, 0f,-1f,0f, -0.5f,-0.5f, 0.5f, 0f,-1f,0f,
            // Right
             0.5f,-0.5f,-0.5f, 1f,0f,0f,  0.5f, 0.5f,-0.5f, 1f,0f,0f,  0.5f, 0.5f, 0.5f, 1f,0f,0f,
             0.5f,-0.5f,-0.5f, 1f,0f,0f,  0.5f, 0.5f, 0.5f, 1f,0f,0f,  0.5f,-0.5f, 0.5f, 1f,0f,0f,
            // Left
            -0.5f,-0.5f,-0.5f,-1f,0f,0f, -0.5f,-0.5f, 0.5f,-1f,0f,0f, -0.5f, 0.5f, 0.5f,-1f,0f,0f,
            -0.5f,-0.5f,-0.5f,-1f,0f,0f, -0.5f, 0.5f, 0.5f,-1f,0f,0f, -0.5f, 0.5f,-0.5f,-1f,0f,0f
        )
        return ByteBuffer.allocateDirect(v.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
            put(v)
            position(0)
        }
    }
}
