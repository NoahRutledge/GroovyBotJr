import Discord, { GuildMember, Snowflake } from 'discord.js';
import 
{
	AudioPlayerStatus,
	AudioResource,
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus
} from '@discordjs/voice';
import { Track } from './Music/Track';
import { MusicSubscription } from './Music/Subscription';
import { validateURL } from 'ytdl-core';
const ytsr = require('ytsr');

const bot = new Discord.Client({intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']});
const { token } = require('../auth.json');

const Subscriptions = new Map<Snowflake, MusicSubscription>();
const YoutubeSearchOptions = 
{
	limit: 1,
	safeSearch: false,
};

const DICKO_MODE = "https://www.youtube.com/watch?v=AUbmUEq6uWA&ab_channel=Kusorare-Topic";

bot.on('ready', () => console.log('Ready!'));

bot.on('messageCreate', async (message) =>
{
	if(message.content.substring(0, 1) == '!')
	{
		const args = message.content.substring(1).split(' ');
		const command = args[0].toLowerCase();

		let subscription = Subscriptions.get(message.guildId);
		if(!subscription)
		{
			switch(command)
			{
				case 'play':
				case 'gimmethedick':
				case 'lemmeticklethefeet':
					subscription = TryEnterChannel(message);
					break;
				default:
					return;
			}
		}

		switch(command)
		{
			case 'play':
			
				if(args.length == 1)
				{
					message.channel.send("Please supply an argument");
					return;
				}

				try
				{
					var requestSong = message.content.substring(6);
					console.log("Received play command for " + requestSong);
					if(validateURL(requestSong) == false)
					{
						console.log("Starting youtube search scrape");
						const searchResult = await ytsr(requestSong, YoutubeSearchOptions);
						console.log("Finished search");
						requestSong = searchResult.items[0].url;
					}

					const track = await Track.From(requestSong, 
											{
												OnStart(title: string)
												{
													message.channel.send('Now Playing "' + title + '"');
												},
												OnFinish()
												{
												},
												OnError(error)
												{
													console.warn(error);
													message.channel.send('Error: ' + error.message);
												},
											}
					);
					subscription.Enqueue(track);
					message.channel.send('Enqueued "' + track.Title + '"');

				} catch(error)
				{
					console.warn(error);
					message.channel.send('Failed to play track!');
				}
				break;

			case 'stop':
				subscription.Stop();
				break;

			case 'skip':
				subscription.Skip();
				break;

			case 'resume':
			case 'unpause':
			case 'start':
				subscription.Resume();
				break;

			case 'pause':
				subscription.Pause()
				break;

			case 'disconnect':
				subscription.Destroy();
				Subscriptions.delete(message.guildId);
				break;

			case 'gimmethedick':
			case 'lemmeticklethefeet':
				subscription.Stop();
				message.channel.send('Giving the dick B)');
				const track = await Track.From(DICKO_MODE, 
											{
												OnStart()
												{
												},
												OnFinish()
												{
													subscription.Enqueue(track);
												},
												OnError(error)
												{
													console.warn(error);
													message.channel.send('Error: ' + error.message);
												},
											}
				);
				subscription.Enqueue(track);
				subscription.Enqueue(track);
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

function TryEnterChannel(message: Discord.Message): MusicSubscription
{
	var subscription = Subscriptions.get(message.guildId);
	if(!subscription)
	{
		subscription = CreateChannelSubscription(message);
		if(!subscription)
			return null;
	}

	try
	{
		entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
		return subscription;
	} 
	catch(error){ console.warn(error); return null; }
}

function CreateChannelSubscription(message: Discord.Message): MusicSubscription
{
	const channel = message.member.voice.channel;
	if(message.member instanceof GuildMember && channel)
	{
		const subscription = new MusicSubscription
		(
			joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})
		);
		subscription.voiceConnection.on('error', console.warn);
		Subscriptions.set(message.guildId, subscription);
		return subscription;
	}
	else
	{
		message.channel.send('You need to join a voice channel first!');
		return null;
	}
}

bot.login(token);