import 
{
	AudioResource,
	createAudioResource,
	demuxProbe
} from '@discordjs/voice';
import Discord from 'discord.js';
import { raw as ytdl } from 'youtube-dl-exec';
import { getBasicInfo } from 'ytdl-core';
import { Logger } from '../groovy';

export interface TrackData {
	Url: string;
	Title: string;
	OnStart: () => void;
	OnFinish: () => void;
	OnError: (error: Error) => void;
}

const noop = () =>
{
 //intentionally blank
};

const stringMatchingTolerance = 0.75;

export class Track implements TrackData
{
	public readonly Url: string;
	public readonly Title: string;
	public readonly RequestMessage: string;
	public Resource: AudioResource<Track>;
	public StartedResourceGet: boolean;
	private _messages: Discord.Message[];
	private _channel: Discord.TextBasedChannel;

	constructor(url: string, title: string, requestMessage: string, channel: Discord.TextBasedChannel)
	{
		this.Url = url;
		this.Title = title;
		this.RequestMessage = requestMessage;
		this._channel = channel;
		this._messages = [];
	}

	public async OnStart()
	{
		var link = new Discord.MessageEmbed()
					   .setDescription("Now playing ["+this.Title+"]("+this.Url+")");
		var m = await this._channel.send({embeds: [link]});
		this.AddMessage(m);
	}

	public OnFinish()
	{
		this.DeleteMessages();
	}

	public DeleteMessages()
	{
		if(this._messages.length !== 0)
		{
			for(var message of this._messages)
			{
				message.delete();
			}
			this._messages = [];
		}
	}

	public OnError(error: Error)
	{
		Logger.LogError(error);
		this._channel.send('An error has occured! Check the logs for more details.');
	}

	public CreateAudioResource(): Promise<AudioResource<Track>>
	{
		this.StartedResourceGet = true;
		return new Promise((resolve, reject) =>
		{
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
		});
	}

	public static async From(url: string, requestMessage: string, channel: Discord.TextBasedChannel): Promise<Track>
	{
		const info = await getBasicInfo(url);
		return new Track(url, info.videoDetails.title, requestMessage, channel);
	}

	public AddMessage(message: Discord.Message)
	{
		this._messages.push(message);
	}

	public IsTextMatch(removeMessage: string): boolean
	{
		let removeMessageMap = new Map();
		let removeMessageSplit = removeMessage.toLowerCase().split(" ");
		let wordsToMatch = removeMessageSplit.length;
		
		for(var word of removeMessageSplit)
		{
			removeMessageMap.set(word, false);
		}

		var count = this.StringMatchCount(removeMessageMap, this.RequestMessage);

		if((count / wordsToMatch) >= stringMatchingTolerance)
		{
			return true;
		}

		count += this.StringMatchCount(removeMessageMap, this.Title);
		if((count / wordsToMatch) >= stringMatchingTolerance)
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	private StringMatchCount(matchWith: Map<string, boolean>, matchAgainst: string): number
	{
		var count = 0;

		for(var word of matchAgainst.toLowerCase().split(" "))
		{
			for(var entry of matchWith.entries())
			{	
				if(entry[1])
				{
					continue;
				}

				if (word.includes(entry[0]))
				{
					matchWith.set(entry[0], true);
					++count;
					break;
				}
			}
		}
		return count;
	}
}