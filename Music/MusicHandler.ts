import { DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { validateURL } from 'ytdl-core';
import Discord, { Snowflake, GuildMember} from 'discord.js';
import { Track } from './Track';
import { MusicSubscription } from './Subscription';
import { Logger } from '../groovy';
const ytsr = require('ytsr');

export const MUSIC_COMMANDS = ["play", "skip", "pause", "disconnect", "stop", "resume", "remove"];

const YoutubeSearchOptions =
{
	limit: 1,
	safeSearch: false,
};

const Subscriptions = new Map<Snowflake, MusicSubscription>();

export async function HandleMusicCommand(command: string, args: string[], message: Discord.Message)
{
	let subscription = Subscriptions.get(message.guildId);
	if (!subscription) {
		switch (command) {
			case 'play':
				subscription = TryEnterChannel(message);
				if (subscription === null)
					message.channel.send("Failed to create join channel!");
				break;
			default:
				return;
		}
	}

	switch (command)
	{
		case 'play':

			if (args.length < 1) {
				message.channel.send("Please supply an argument");
				return;
			}

			const requestMessage = message.content.substring(6);
			let requestUrl = requestMessage;

			if (validateURL(requestMessage) == false)
			{
				try
				{
					const searchResult = await ytsr(requestMessage, YoutubeSearchOptions);
					requestUrl = searchResult.items[0].url;
				}
				catch (error)
				{
					Logger.LogError(error, 'Failed to find track from ytsr');
					message.channel.send("Failed to play track!  Check the logs for more details.");
					return;
                }
			}

			let track;
			try
			{
				track = await Track.From(requestUrl, requestMessage, message.channel);
			}
			catch (error)
			{
				Logger.LogError(error, 'Failed in getting video from URL');
				message.channel.send("Failed to play track with found URL!  Check the logs for more details.");
				return;
			}

			subscription.Enqueue(track);
			var m = await message.channel.send('Enqueued "' + track.Title + '"')
			track.AddMessage(m);

			break;

		case 'stop':
			subscription.Stop();
			break;

		case 'skip':
			subscription.Skip();
			break;

		case 'resume':
			subscription.Resume();
			break;

		case 'pause':
			subscription.Pause()
			break;

		case 'disconnect':
			subscription.Destroy();
			Subscriptions.delete(message.guildId);
			break;

		case 'remove':
			var songToRemove = message.content.substring(8);
			subscription.RemoveFromQueue(songToRemove);
			break;
    }
}

function TryEnterChannel(message: Discord.Message): MusicSubscription {
	var subscription = Subscriptions.get(message.guildId);
	if (subscription == null)
	{
		subscription = CreateChannelSubscription(message);
		if (subscription == null)
			return null;
	}

	try
	{
		entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
		return subscription;
	}
	catch (error)
	{
		Logger.LogError(error, "Connection status failed to be ready");
		message.channel.send("Something broke!  Please check log for more information!");
		return null;
	}
}

function CreateChannelSubscription(message: Discord.Message): MusicSubscription {
	const channel = message.member.voice.channel;
	if (message.member instanceof GuildMember && channel) {
		const subscription = new MusicSubscription
			(
				joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
				})
			);
		subscription.voiceConnection.on('error', Logger.LogError);
		Subscriptions.set(message.guildId, subscription);
		return subscription;
	}
	else {
		message.channel.send('You need to join a voice channel first!');
		return null;
	}
}