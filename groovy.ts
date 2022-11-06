import Discord, { Snowflake } from 'discord.js';
import { HandleMusicCommand, TryEnterChannel } from './Music/MusicHandler';
import { MusicSubscription } from './Music/Subscription';
import { CreateCommand } from './CreateCommand/CommandHandler';

const bot = new Discord.Client({intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']});
const { token } = require('../auth.json');
export const Subscriptions = new Map<Snowflake, MusicSubscription>();

const MUSIC_COMMANDS = ["play", "skip", "pause", "disconnect", "stop", "resume", "remove"];

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

		switch(command)
		{
			case 'makecommand':
				if (args.length < 3)
					message.channel.send("Not enough arguments: createcommand [command name] [action]");
				else
				{
					let commandAction = message.content.substring(command.length + args[1].length + 3);
					StartCreateCommand(message, args[1], commandAction);
				}
				break;

			case 'tempmessage':
				if (args.length < 2)
				{
					message.channel.send("Not enough arguments: tempmessage [message] [(optional) number in minutes: message duration]");
					return;
				}

				const channel = message.channel;

				message.delete();
				var m = channel.send(args[1]);
				var duration = args.length == 3 ? +args[2] : TEMPMESSAGE_TIMEOUT_DEFAULT;
				//Scale up to seconds/minutes
				duration *= 60000;
				setTimeout(temp, duration, m);

				break;

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

function temp(messagePromise: Promise<Discord.Message<boolean>>)
{
	messagePromise.then(function (message) {
		message.delete();
	});
}

async function StartCreateCommand(message: Discord.Message, name: string, action: string)
{
	let result = await CreateCommand(name, action);
	message.channel.send(result);
}

bot.login(token);