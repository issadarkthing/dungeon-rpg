import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { Player } from "../structure/Player";
import { Battle } from "@jiman24/discordjs-rpg";
import { Monster } from "../structure/Monster";
import { bold, currency, random } from "../utils";
import { ButtonHandler } from "@jiman24/discordjs-button";
import { MessageEmbed as Embed } from "../structure/MessageEmbed";
import { Item } from "../structure/Item";

class SearchMonster extends ButtonHandler {
  player: Player;
  _msg: Message;
  readonly range = 10;

  constructor(msg: Message, embed: MessageEmbed | string, player: Player) {
    super(msg, embed);
    this._msg = msg;
    this.player = player;
  }

  async search(cb: (monster: Monster) => Promise<void>) {

    let lower = this.player.level - Math.round(this.range / 2);
    let upper = this.player.level + this.range;

    if (lower < 0) {
      lower = 0;
    }

    if (upper > Monster.all.length - 1) {
      upper = Monster.all.length - 1;
    }

    const monsters = Monster.all.slice(lower, upper);
    const monster = random.pick(monsters);
    const button = new ButtonHandler(this._msg, monster.show(this.player));

    button.addButton("search again", () => this.search(cb))
    button.addButton("battle", () => cb(monster))
    button.addCloseButton();

    await button.run();
  }
}

export default class extends Command {
  name = "hunt";
  description = "randomly searches for monsters";

  async exec(msg: Message) {

    const player = await Player.fromUser(msg.author);
    const search = new SearchMonster(msg, "", player);

    await search.search(async monster => {

      const battle = new Battle(msg, random.shuffle([player, monster]));
      battle.interval = process.env.ENV === "DEV" ? 1000 : 3000;
      const winner = await battle.run();
      player.hunt++;

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
        player.win++;

        const embed = new Embed(msg.author)
          .appendDescription(`${player.name} has earned ${bold(monster.drop)} ${currency}!`)
          .appendDescription(`${player.name} has earned ${bold(monster.xpDrop)} xp!`);

        this.sendEmbed(msg, embed);

        if (currLevel !== player.level) {
          embed.setDescription(`${player.name} is now on level ${bold(player.level)}!`);
          this.sendEmbed(msg, embed);
        }
      } 

      player.save();

    })

  }
}
