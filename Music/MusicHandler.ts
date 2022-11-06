import { DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { validateURL } from 'ytdl-core';
import Discord, { GuildMember} from 'discord.js';
import { Track } from './Track';
import { MusicSubscription } from './Subscription';
import { Subscriptions } from '../groovy';

const ytsr = require('ytsr');
const YoutubeSearchOptions =
{
	limit: 1,
	safeSearch: false,
};

export const MUSIC_COMMANDS = ["play", "skip", "pause", "disconnect", "stop", "resume", "remove"];

export async function HandleMusicCommand(command: string, args: string[], message: Discord.Message)
{
	let subscription = Subscriptions.get(message.guildId);
	if (!subscription) {
		switch (command) {
			case 'play':
				subscription = TryEnterChannel(message);
				break;
			default:
				return;
		}
	}

	switch (command)
	{
		case 'play':

			if (args.length == 1) {
				message.channel.send("Please supply an argument");
				return;
			}

			try {
				var requestMessage = message.content.substring(6);
				var requestUrl = "";
				if (validateURL(requestMessage) == false) {
					const searchResult = await ytsr(requestMessage, YoutubeSearchOptions);
					requestUrl = searchResult.items[0].url;
				}
				else {
					requestUrl = requestMessage;
				}

				const track = await Track.From(requestUrl, requestMessage, message.channel);
				subscription.Enqueue(track);
				var m = await message.channel.send('Enqueued "' + track.Title + '"')
				track.AddMessage(m);

			} catch (error) {
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
	if (!subscription) {
		subscription = CreateChannelSubscription(message);
		if (!subscription)
			return null;
	}

	try {
		entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
		return subscription;
	}
	catch (error) { console.warn(error); return null; }
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
		subscription.voiceConnection.on('error', console.warn);
		Subscriptions.set(message.guildId, subscription);
		return subscription;
	}
	else {
		message.channel.send('You need to join a voice channel first!');
		return null;
	}
}