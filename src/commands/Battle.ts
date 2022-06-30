import { Command } from "@jiman24/commandment";
import { Player } from "../structure/Player";
import { Message } from "discord.js";
import { Monster } from "../structure/Monster";
import { Pagination } from "@jiman24/discordjs-pagination";
import { Battle } from "@jiman24/discordjs-rpg";
import { bold, currency, random } from "../utils";
import { MessageEmbed } from "../structure/MessageEmbed";
import { Item } from "../structure/Item";

export default class extends Command {
  name = "battle";
  block: boolean = true;
  description = "battle monsters";
  aliases: string[] = ["b"];

  async exec(msg: Message) {

    const player = await Player.fromUser(msg.author)
    const monsters = Monster.all.map(x => x.show(player));
    const menu = new Pagination(msg, monsters, player.currentMonster);
    let monster = Monster.all[0];
    let position = 0;

    menu.setSelectText("Battle");

    menu.setOnSelect((x) => {
      monster = Monster.all[x];
      position = x;
      player.currentMonster = x;
      player.save();
    });

    await menu.run();

    const battle = new Battle(msg, random.shuffle([player, monster]));

    battle.showBattle = true;
    battle.setInterval(500);

    const winner = await battle.run();

    if (winner.id === player.id) {

      const dropItem = random.bool(0.2);

      if (dropItem) {

        const item = random.pick(Item.all);

        player.inventory.push(item);
        player.save();

        const itemEmbed = item.show();
        itemEmbed.setDescription(`${monster.name} dropped ${bold(item.name)}!`);

        this.sendEmbed(msg, itemEmbed);
      }

      const currLevel = player.level;
      player.addXP(monster.xpDrop);
      player.coins += monster.drop;

      const embed = new MessageEmbed(msg.author)
        .appendDescription(`${player.name} has earned ${bold(monster.drop)} ${currency}!`)
        .appendDescription(`${player.name} has earned ${bold(monster.xpDrop)} xp!`);

      this.sendEmbed(msg, embed);

      if (currLevel !== player.level) {
        embed.setDescription(`${player.name} is now on level ${bold(player.level)}!`);
        this.sendEmbed(msg, embed);
      }

      player.currentMonster = position;
    }

    player.save();
  }
}
