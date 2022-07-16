import Discord, { Snowflake } from 'discord.js';
import { HandleMusicCommand, TryEnterChannel } from './MusicHandler';
import { MusicSubscription } from './Music/Subscription';

const bot = new Discord.Client({intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']});
const { token } = require('../auth.json');
export const Subscriptions = new Map<Snowflake, MusicSubscription>();

const MUSIC_COMMANDS = ["play", "skip", "disconnect", "stop", "resume", "remove"];

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

		switch(command)
		{
			case 'doubt':
				message.channel.send({files: ["./images/doubt.jpg"]});
				break;

			default:
				message.channel.send('Not a recognized command!');
				break;
		}
	}

	let subscription = Subscriptions.get(message.guildId);
	if(!subscription && message.content.toLowerCase().includes('groovy bot'))
	{
		TryEnterChannel(message);	
	}
});

bot.login(token);