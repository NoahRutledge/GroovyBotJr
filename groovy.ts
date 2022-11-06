import Discord, { Snowflake } from 'discord.js';
import { HandleMusicCommand, MUSIC_COMMANDS } from './Music/MusicHandler';
import { MusicSubscription } from './Music/Subscription';
import { HandleUserMadeCommand, USER_MADE_COMMANDS } from './CreateCommand/CommandHandler';

const bot = new Discord.Client({intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']});
const { token } = require('../auth.json');
export const Subscriptions = new Map<Snowflake, MusicSubscription>();

const TEMPMESSAGE_TIMEOUT_DEFAULT = 2;

bot.on('ready', () => console.log('Ready!'));
bot.on('messageCreate', async (message) =>
{
	var commandChar = message.content.substring(0, 1);
	if(commandChar == '!' || commandChar == '-')
	{
		const args = message.content.substring(1).split(' ');
		const command = args[0].toLowerCase();

		if (MUSIC_COMMANDS.includes(command))
		{
			HandleMusicCommand(command, args, message);
			return;
        }

		if (USER_MADE_COMMANDS.includes(command))
		{
			HandleUserMadeCommand(command, args, message);
			return;
        }

		switch(command)
		{
			case 'temp':
				if (args.length < 2)
				{
					message.channel.send("Not enough arguments: temp[message] [(optional) message duration in minutes]");
					return;
				}

				const channel = message.channel;
				const userNickname = await message.guild.members.fetch(message.author).then(function (result) { return result.nickname; });

				message.delete();
				var messagePromise = channel.send(`${userNickname} said: ${args[1]}`);
				var duration = args.length == 3 ? +args[2] : TEMPMESSAGE_TIMEOUT_DEFAULT;
				//Scale up to seconds/minutes
				duration *= 60000;
				setTimeout(RemoveTemp, duration, messagePromise);

				break;

			default:
				message.channel.send('Not a recognized command!');
				break;
		}
	}
});

function RemoveTemp(messagePromise: Promise<Discord.Message<boolean>>)
{
	messagePromise.then(function (message) {
		message.delete();
	});
}

bot.login(token);