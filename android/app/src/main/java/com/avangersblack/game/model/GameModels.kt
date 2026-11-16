package com.avangersblack.game.model

enum class Gender { MALE, FEMALE }
enum class BuildType { LEAN, ATHLETIC, HEAVY }
enum class FaceShape { OVAL, ANGULAR, BROAD }
enum class HairStyle { SHORT, FADE, LONG, BUN, BALD }
enum class BeardStyle { NONE, STUBBLE, SHORT, FULL }
enum class OutfitStyle { COAT, TACTICAL, CIVILIAN, SHADOW_COAT }
enum class AccessoryType { NONE, GLASSES, EARPIECE, SCARF, WATCH, ECHO_VISOR }
enum class GraphicsQuality { LOW, MEDIUM, HIGH, UHD_4K }
enum class WeatherType { CLEAR, RAIN, FOG }
enum class GameScreen { MENU, CREATOR, PLAYING, INVENTORY, PROGRESSION, SETTINGS }
enum class GuardStatus { PATROL, SUSPICIOUS, ALERT, STUNNED, BRIBED }
enum class EndingPath { GHOST, DIPLOMAT, ENFORCER }

data class CharacterProfile(
    val name: String = "Kaelen Noir",
    val gender: Gender = Gender.MALE,
    val skinToneHex: String = "#C68B67",
    val eyeColorHex: String = "#3B6E8C",
    val faceShape: FaceShape = FaceShape.ANGULAR,
    val hairStyle: HairStyle = HairStyle.FADE,
    val hairColorHex: String = "#1B1C20",
    val beardStyle: BeardStyle = BeardStyle.STUBBLE,
    val heightScale: Float = 1.0f,
    val buildType: BuildType = BuildType.ATHLETIC,
    val outfitStyle: OutfitStyle = OutfitStyle.COAT,
    val outfitColorHex: String = "#1F252D",
    val accessory: AccessoryType = AccessoryType.EARPIECE,
    val hasScar: Boolean = true,
    val hasTattoo: Boolean = true,
    val voicePitch: Float = 0.95f,
    val unlockedRewards: Set<String> = emptySet()
)

data class InventoryItem(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val equippable: Boolean = false,
    val stats: String = ""
)

data class EchoProfile(
    val humanity: Int = 0,
    val exposure: Int = 10,
    val insight: Int = 0
)

data class MissionProgress(
    val chapter: Int = 1,
    val chapterTitle: String = "Chapitre 1 — Nuit sur le Quai 4",
    val activeObjective: String = "Explorez Port-Brume et déchiffrez le coffre du Hangar 4.",
    val cluesFound: Set<String> = emptySet(),
    val spotlightDisabled: Boolean = false,
    val safeUnlocked: Boolean = false,
    val nadiaAllied: Boolean = false,
    val ch2LasersDisabled: Boolean = false,
    val ch2ValveSolved: Boolean = false,
    val guardStatus: GuardStatus = GuardStatus.PATROL,
    val endingPath: EndingPath? = null,
    val decisionsLog: List<String> = emptyList()
)

data class PlayerRuntimeState(
    val health: Int = 100,
    val stamina: Int = 100,
    val focus: Int = 100,
    val crouching: Boolean = false,
    val echoActive: Boolean = false,
    val suspicion: Int = 0,
    val equippedWeaponId: String? = null,
    val x: Float = -16f,
    val z: Float = 14f,
    val yawRad: Float = 0f
)

data class GameSettings(
    val quality: GraphicsQuality = GraphicsQuality.HIGH,
    val shadowsEnabled: Boolean = true,
    val weather: WeatherType = WeatherType.RAIN,
    val timeOfDay: Float = 21.5f,
    val audioEnabled: Boolean = true
)
