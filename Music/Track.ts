import 
{
	AudioResource,
	createAudioResource,
	demuxProbe
} from '@discordjs/voice';

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
	public readonly OnStart: (title: string) => void;
	public readonly OnFinish: () => void;
	public readonly OnError: (error: Error) => void;

	constructor({Url, Title, OnStart, OnFinish, OnError}: TrackData)
	{
		this.Url = Url;
		this.Title = Title;
		this.OnStart = OnStart;
		this.OnFinish = OnFinish;
		this.OnError = OnError;
	}

	public CreateAudioResource(): Promise<AudioResource<Track>>
	{
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
				demuxProbe(stream)
							.then((probe) => resolve(createAudioResource(probe.stream, {metadata: this, inputType: probe.type})))
							.catch(OnError);
			}).catch(OnError);
		});
	}

	public static async From(url: string, methods: Pick<Track, 'OnStart' | 'OnFinish' | 'OnError'>): Promise<Track>
	{
		const info = await getBasicInfo(url);
		const wrappedMethods = 
		{
			OnStart()
			{
				wrappedMethods.OnStart = noop;
				methods.OnStart(info.videoDetails.title);
			},
			OnFinish()
			{
				wrappedMethods.OnFinish = noop;
				methods.OnFinish();
			},
			OnError(error: Error)
			{
				wrappedMethods.OnError = noop;
				methods.OnError(error);
			},
		};

		return new Track({Title: info.videoDetails.title,
						  Url: url,
						  ...wrappedMethods,
						  });
	}
}