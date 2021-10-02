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
	public StartedResourceGet: boolean;
	public readonly OnStart: (title: string) => void;
	public readonly OnFinish: () => void;
	public readonly OnError: (error: Error) => void;

	constructor({Url, Title, OnStart, OnFinish, OnError}: TrackData)
	{
		this.Url = Url;
		this.Title = Title;
		this.StartedResourceGet = false;
		this.OnStart = OnStart;
		this.OnFinish = OnFinish;
		this.OnError = OnError;
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

	public static async From(url: string, methods: Pick<Track, 'OnStart' | 'OnFinish' | 'OnError'>): Promise<Track>
	{
		console.log("Starting getting basic info");
		const info = await getBasicInfo(url);
		console.log("Finished getting basic info");
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