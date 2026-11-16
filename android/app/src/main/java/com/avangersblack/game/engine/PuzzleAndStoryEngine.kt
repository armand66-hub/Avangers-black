package com.avangersblack.game.engine

import android.content.Context
import com.avangersblack.game.model.CharacterProfile
import com.avangersblack.game.model.EchoProfile
import com.avangersblack.game.model.EndingPath
import com.avangersblack.game.model.GuardStatus
import com.avangersblack.game.model.InventoryItem
import com.avangersblack.game.model.MissionProgress
import com.avangersblack.game.model.OutfitStyle
import com.avangersblack.game.model.PlayerRuntimeState
import org.json.JSONObject

class PuzzleAndStoryEngine(private val context: Context) {

    var character = CharacterProfile()
    var mission = MissionProgress()
    var echo = EchoProfile()
    var player = PlayerRuntimeState()
    val inventory = mutableListOf(
        InventoryItem("item_flashlight", "Lampe tactique UV", "tool", "Révèle les marquages effacés."),
        InventoryItem("item_baton", "Matraque rétractable K-2", "melee", "Neutralisation silencieuse.", true, "Dégâts 28")
    )

    fun validateSafeCode(chapter: Int, digits: IntArray): Boolean {
        val target = if (chapter == 1) intArrayOf(4, 3, 2, 7) else intArrayOf(4, 2, 3, 9)
        if (!digits.contentEquals(target)) return false

        if (chapter == 1) {
            mission = mission.copy(
                safeUnlocked = true,
                activeObjective = "Rejoignez la trappe du Passage Souterrain au nord-est.",
                decisionsLog = mission.decisionsLog + "Coffre du Hangar 4 déverrouillé (4327)."
            )
            addUniqueItem(InventoryItem("item_keycard", "Badge magnétique Secteur 4", "tool", "Ouvre le passage souterrain."))
            addUniqueItem(InventoryItem("item_pistol_k9", "Pistolet K-9 à impulsions", "firearm", "Arme subsonique non létale.", true, "Choc 55"))
        } else {
            mission = mission.copy(
                ch2LasersDisabled = true,
                ch2ValveSolved = true,
                activeObjective = "Extrayez les preuves depuis le Serveur de la Coupure.",
                decisionsLog = mission.decisionsLog + "Tableau des vannes validé (4239) — Lasers désactivés."
            )
        }
        echo = echo.copy(insight = echo.insight + 30)
        saveState()
        return true
    }

    fun getNpcGreeting(chapter: Int): String {
        return if (chapter == 1) {
            when (character.outfitStyle) {
                OutfitStyle.TACTICAL, OutfitStyle.SHADOW_COAT ->
                    "Nadia : « Vu votre équipement, ${character.name}, la Garde vous repérera vite. Coupez le projecteur à l'ouest. »"
                OutfitStyle.CIVILIAN ->
                    "Nadia : « Avec cette allure discrète, ${character.name}, vous pouvez encore négocier avant que l'alerte ne sonne. »"
                else ->
                    "Nadia : « ${character.name}… je ne pensais pas revoir quelqu'un ici après la Coupure. »"
            }
        } else {
            if (mission.nadiaAllied) {
                "Joris : « Nadia m'a prévenu de votre arrivée, ${character.name}. On peut vous faire confiance. »"
            } else {
                "Joris : « Le Serveur de la Coupure est derrière les lasers. Résolvez les vannes ou passez par la brèche à l'est. »"
            }
        }
    }

    fun applyDiplomaticAlliance() {
        mission = mission.copy(
            nadiaAllied = true,
            guardStatus = GuardStatus.BRIBED,
            decisionsLog = mission.decisionsLog + "Alliance conclue : la sentinelle a été détournée sans combat."
        )
        echo = echo.copy(humanity = echo.humanity + 25)
        saveState()
    }

    fun completeChapter1(): EndingPath {
        val path = when {
            mission.nadiaAllied || mission.guardStatus == GuardStatus.BRIBED -> EndingPath.DIPLOMAT
            mission.guardStatus == GuardStatus.PATROL && echo.exposure < 30 -> EndingPath.GHOST
            else -> EndingPath.ENFORCER
        }
        character = character.copy(
            unlockedRewards = character.unlockedRewards + setOf("shadow_coat", "echo_visor")
        )
        mission = mission.copy(
            chapter = 2,
            chapterTitle = "Chapitre 2 — Les Galeries de la Coupure",
            activeObjective = "Explorez l'appartement sûr et atteignez le Serveur de la Coupure.",
            guardStatus = GuardStatus.PATROL,
            endingPath = path
        )
        player = player.copy(x = -12f, z = 16f, health = 100, stamina = 100, focus = 100, suspicion = 0)
        saveState()
        return path
    }

    private fun addUniqueItem(item: InventoryItem) {
        if (inventory.none { it.id == item.id }) {
            inventory.add(item)
        }
    }

    fun saveState() {
        val prefs = context.getSharedPreferences("avangers_black_prefs", Context.MODE_PRIVATE)
        val json = JSONObject().apply {
            put("name", character.name)
            put("chapter", mission.chapter)
            put("humanity", echo.humanity)
            put("exposure", echo.exposure)
            put("insight", echo.insight)
            put("safeUnlocked", mission.safeUnlocked)
        }
        prefs.edit().putString("save_v1", json.toString()).apply()
    }

    fun loadState(): Boolean {
        val prefs = context.getSharedPreferences("avangers_black_prefs", Context.MODE_PRIVATE)
        val raw = prefs.getString("save_v1", null) ?: return false
        return try {
            val json = JSONObject(raw)
            character = character.copy(name = json.optString("name", character.name))
            val ch = json.optInt("chapter", 1)
            mission = mission.copy(
                chapter = ch,
                safeUnlocked = json.optBoolean("safeUnlocked", false)
            )
            echo = echo.copy(
                humanity = json.optInt("humanity", 0),
                exposure = json.optInt("exposure", 10),
                insight = json.optInt("insight", 0)
            )
            true
        } catch (_: Exception) {
            false
        }
    }
}
