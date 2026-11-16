package com.avangersblack.game.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.avangersblack.game.engine.PuzzleAndStoryEngine
import com.avangersblack.game.model.*

@Composable
fun AvangersBlackOverlay(
    engine: PuzzleAndStoryEngine,
    screen: GameScreen,
    onScreenChange: (GameScreen) -> Unit,
    onMoveJoystick: (Float, Float) -> Unit,
    onCameraDrag: (Float, Float) -> Unit
) {
    val bgCard = Color(0xE6101217)
    val accent = Color(0xFFF59E0B)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(screen) {
                detectDragGestures { _, drag ->
                    if (screen == GameScreen.PLAYING) {
                        onCameraDrag(drag.x, drag.y)
                    }
                }
            }
    ) {
        when (screen) {
            GameScreen.MENU -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(24.dp)
                        .widthIn(max = 360.dp)
                        .background(bgCard, RoundedCornerShape(16.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(16.dp))
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("AVANGERS BLACK", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "Aventure · Survie · Énigmes",
                        color = accent,
                        fontSize = 12.sp
                    )
                    Button(
                        onClick = { onScreenChange(GameScreen.PLAYING) },
                        colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = Color.Black),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) { Text("Nouvelle partie / Continuer", fontWeight = FontWeight.SemiBold) }

                    OutlinedButton(
                        onClick = { onScreenChange(GameScreen.CREATOR) },
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) { Text("Création du personnage", color = Color.White) }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { onScreenChange(GameScreen.INVENTORY) },
                            modifier = Modifier.weight(1f).height(44.dp)
                        ) { Text("Inventaire", color = Color.White, fontSize = 12.sp) }
                        OutlinedButton(
                            onClick = { onScreenChange(GameScreen.PROGRESSION) },
                            modifier = Modifier.weight(1f).height(44.dp)
                        ) { Text("Écho", color = Color.White, fontSize = 12.sp) }
                    }

                    OutlinedButton(
                        onClick = { onScreenChange(GameScreen.SETTINGS) },
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) { Text("Paramètres", color = Color.White) }
                }
            }

            GameScreen.CREATOR -> {
                var name by remember { mutableStateOf(engine.character.name) }
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                        .fillMaxWidth(0.92f)
                        .background(bgCard, RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Personnalisation du personnage", color = Color.White, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(
                        value = name,
                        onValueChange = {
                            name = it
                            engine.character = engine.character.copy(name = it)
                        },
                        label = { Text("Nom") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutfitStyle.entries.forEach { style ->
                            FilterChip(
                                selected = engine.character.outfitStyle == style,
                                onClick = {
                                    engine.character = engine.character.copy(outfitStyle = style)
                                },
                                label = { Text(style.name, fontSize = 11.sp) }
                            )
                        }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        TextButton(onClick = { onScreenChange(GameScreen.MENU) }) {
                            Text("Menu", color = Color.LightGray)
                        }
                        Button(
                            onClick = { onScreenChange(GameScreen.PLAYING) },
                            colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = Color.Black)
                        ) { Text("Lancer l'aventure") }
                    }
                }
            }

            GameScreen.PLAYING -> {
                // Top HUD
                Column(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(16.dp)
                        .background(bgCard, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Text("${engine.character.name} · Ch.${engine.mission.chapter}", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        "Vie ${engine.player.health} · Sang-froid ${engine.player.focus}",
                        color = accent,
                        fontSize = 11.sp
                    )
                    Text(engine.mission.activeObjective, color = Color.LightGray, fontSize = 11.sp)
                }

                IconButton(
                    onClick = { onScreenChange(GameScreen.MENU) },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .background(bgCard, CircleShape)
                ) {
                    Text("≡", color = Color.White, fontSize = 20.sp)
                }

                // Touch Joystick (Bottom Left)
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(24.dp)
                        .size(104.dp)
                        .background(bgCard, CircleShape)
                        .border(1.dp, Color.White.copy(alpha = 0.25f), CircleShape)
                        .pointerInput(Unit) {
                            detectDragGestures(
                                onDragEnd = { onMoveJoystick(0f, 0f) },
                                onDragCancel = { onMoveJoystick(0f, 0f) }
                            ) { _, drag ->
                                onMoveJoystick(
                                    (drag.x / 40f).coerceIn(-1f, 1f),
                                    (drag.y / 40f).coerceIn(-1f, 1f)
                                )
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Box(Modifier.size(40.dp).background(accent, CircleShape))
                }

                // Action Buttons (Bottom Right)
                Row(
                    modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {
                            engine.player = engine.player.copy(crouching = !engine.player.crouching)
                        },
                        modifier = Modifier.height(48.dp)
                    ) { Text("Discret") }
                    Button(
                        onClick = {
                            engine.player = engine.player.copy(echoActive = !engine.player.echoActive)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = Color.Black),
                        modifier = Modifier.height(48.dp)
                    ) { Text("Écho") }
                }
            }

            else -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp)
                        .fillMaxWidth(0.85f)
                        .background(bgCard, RoundedCornerShape(16.dp))
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(screen.name, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "Humanité: ${engine.echo.humanity} · Exposition: ${engine.echo.exposure}% · Perspicacité: ${engine.echo.insight}",
                        color = accent,
                        fontSize = 13.sp
                    )
                    Button(
                        onClick = { onScreenChange(GameScreen.MENU) },
                        colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = Color.Black)
                    ) { Text("Retour") }
                }
            }
        }
    }
}
