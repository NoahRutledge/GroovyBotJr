import Discord from 'discord.js';
import { HandleMusicCommand, MUSIC_COMMANDS } from './Music/MusicHandler';
import { HandleUserMadeCommand, IsUserMadeCommand, PrefetchUserMadeCommands, USER_MADE_COMMANDS } from './CreateCommand/CommandHandler';

const bot = new Discord.Client({intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']});
const { token } = require('../auth.json');

const TEMPMESSAGE_TIMEOUT_DEFAULT = 2;


/// LOGGER SETUP
const winston = require('winston');
const { combine, printf, errors } = winston.format;
const LoggingFormat = printf(({ level, message, stack }) => { let r = `${level}: ${message}`; if (stack) r += `\n${stack}`; return r });

export class Logger
{
	static Logger = winston.createLogger(
		{
			level: 'info',
			format: combine(errors({ stack: true }), LoggingFormat),
			transports:
				[
					new winston.transports.File({ filename: 'Log/bot.log' }),
					new winston.transports.Console()
				],
			exceptionHandlers:
				[
					new winston.transports.File({ filename: 'Log/uncaughtexception.log' }),
					new winston.transports.Console()
				],
			exitOnError: false,
		}
	);

	static LogInfo(content: any)
	{
		this.Logger.info(content);
	}


	static LogError(error: Error, message : string = "")
	{
		this.Logger.error(message, {message: error});
    }
}
///END LOGGER SETUP

bot.on('ready', () => { PrefetchUserMadeCommands(); Logger.LogInfo("Ready!"); });
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

		if (USER_MADE_COMMANDS.includes(command) || IsUserMadeCommand(command))
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

				const userNickname = await message.guild.members.fetch(message.author).then(function (result) { return result.nickname; });
				let copiedMessage;
				var duration = parseFloat(args[args.length - 1]);
				if (isNaN(duration))
				{
					duration = TEMPMESSAGE_TIMEOUT_DEFAULT;
					copiedMessage = args.slice(1).join(' ');
				}
				else
				{
					copiedMessage = args.slice(1, -1).join(' ');
                }

				var messagePromise = message.channel.send(`${userNickname} said: ${copiedMessage}`);
				message.delete();

				//Scale up to seconds/minutes
				duration *= 60000;
				setTimeout(RemoveTemp, duration, messagePromise);

				break;

			default:
				message.channel.send('Not a recognized command!');
				Logger.LogInfo(`Attempted not recognized command (${message.content})`);
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