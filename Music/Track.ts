import 
{
	AudioResource,
	createAudioResource,
	demuxProbe
} from '@discordjs/voice';
import Discord, { GuildMember, Snowflake } from 'discord.js';
import { raw as ytdl } from 'youtube-dl-exec';
import { getBasicInfo } from 'ytdl-core';

export interface TrackData {
	Url: string;
	Title: string;
	OnStart: (title: string) => void;
	OnFinish: () => void;
	OnError: (error: Error) => void;
}

const noop = () =>
{
 //intentionally blank
};

export class Track implements TrackData
{
	public readonly Url: string;
	public readonly Title: string;
	public Resource: AudioResource<Track>;
	public StartedResourceGet: boolean;
	private _messages: Discord.Message[];
	private _channel: Discord.TextBasedChannels;

	constructor(url: string, title: string, channel: Discord.TextBasedChannels)
	{
		this.Url = url;
		this.Title = title;
		this._channel = channel;
		this._messages = [];
	}

	public async OnStart(title: string)
	{
		var m = await this._channel.send('Now Playing "' + title + '"');
		this.AddMessage(m);
	}

	public OnFinish()
	{
		for(var message of this._messages)
		{
			message.delete();
		}
	}

	public OnError(error: Error)
	{
		console.warn(error);
		this._channel.send('Error: ' + error.message);
	}

	public CreateAudioResource(): Promise<AudioResource<Track>>
	{
		this.StartedResourceGet = true;
		return new Promise((resolve, reject) =>
		{
			console.log("Creating ytdl");
			var process = ytdl
			(
				this.Url,
				{
					o: '-',
					q: '',
					f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
					r: '100k',
				},
				{ stdio: ['ignore', 'pipe', 'ignore']},
			);
			console.log("Finished ytdl");

			if(!process.stdout)
			{
				reject(new Error('No stdout'));
				return;
			}

			var stream = process.stdout;
			var OnError = (error: Error) =>
			{
				if(!process.killed)
					process.kill();
				stream.resume();
				reject(error);
			}

			process.once('spawn', () => 
			{
				console.log("ytdl has 'spawned' starting probe?");
				demuxProbe(stream)
							.then((probe) => resolve(createAudioResource(probe.stream, {metadata: this, inputType: probe.type})))
							.catch(OnError);
				console.log("Finished probe");
			}).catch(OnError);
			console.log("Finished CreateAudioResource()");
		});
	}

	public static async From(url: string, channel: Discord.TextBasedChannels): Promise<Track>
	{
		console.log("Starting getting basic info");
		const info = await getBasicInfo(url);
		console.log("Finished getting basic info");

		return new Track(url, info.videoDetails.title, channel);
	}

	public AddMessage(message: Discord.Message)
	{
		this._messages.push(message);
	}
}