import
{
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';

import { Track } from './Track';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export class MusicSubscription 
{
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer: AudioPlayer;
	private _queue: Track[];
	private _currentTrack: Track;
	private _queueLock = false;
	private _readyLock = false;

	public constructor(voiceConnection: VoiceConnection)
	{
		this.voiceConnection = voiceConnection;
		this.audioPlayer = createAudioPlayer();
		this._queue = [];

		this.voiceConnection.on('stateChange', async (_, newState) => 
		{
			console.log("Voice connection state changed to " + newState.status);
			if(newState.status === VoiceConnectionStatus.Disconnected) 
			{
				if(newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014)
				{
					/*
						Closing with 4014 code means that we should not manually attempt to reconnect.
						There is a chance the connection will recover if the reason was due to switching voice channels.
						It is also the same code for being kicked from the channel.  Wait to figure out which scenario.
					*/
					try
					{
						entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
					}
					catch
					{
						this.voiceConnection.destroy();
					}
				}
				else if(this.voiceConnection.rejoinAttempts < 5)
				{
					wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
					this.voiceConnection.rejoin();
				}
				else
				{
					this.voiceConnection.destroy();
				}
			}
			else if(newState.status === VoiceConnectionStatus.Destroyed)
			{
				this.Stop();
			}
			else if(this._readyLock == false &&
					(newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling))
			{
				// Allow 20 second grace period when connecting or signalling before destroying connection
				this._readyLock = true;
				try
				{
					entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
				}
				catch
				{
					if(this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed)
						this.voiceConnection.destroy();
				}
				finally
				{
					this._readyLock = false;
				}
			}
		});

		this.audioPlayer.on('stateChange', (oldState, newState) => 
		{
			console.log("Audio player state changed from " + oldState.status + " to " + newState.status);
			if(newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle)
			{
				//Entered idle state from a non-idle state.  Process queue to play next Track
				(oldState.resource as AudioResource<Track>).metadata.OnFinish();
				void this.ProcessQueue();
			}
			else if(newState.status === AudioPlayerStatus.Playing)
			{
				var nextTrack = newState.resource as AudioResource<Track>
				nextTrack.metadata.OnStart(this._currentTrack.Title);
			}
		});
		
		this.audioPlayer.on('error', (error) => (error.resource as AudioResource<Track>).metadata.OnError(error));
		this.voiceConnection.subscribe(this.audioPlayer);
	}

	public Destroy()
	{
		this.Stop();
		this.voiceConnection.destroy();
	}

	public Enqueue(track)
	{
		this._queue.push(track);
		this.ProcessQueue();
	}

	public Resume()
	{
		this.audioPlayer.unpause();
	}

	public Pause()
	{
		this.audioPlayer.pause();
	}

	public Skip()
	{
		if(this._queue.length === 0)
		{
			this.Stop();
		}
		else
		{
			this.ProcessQueue(true);
		}
	}

	public Stop()
	{
		this._queueLock = true;
		this._queue = [];
		this.audioPlayer.stop(true);
		this._queueLock = false;
	}

	public QueueLength(): number
	{
		return this._queue.length;
	}

	public async FetchNextTrack()
	{
		console.log("Attempting to fetch next track");
		//Just to be safe
		if(this.QueueLength() <= 0)
			return;
		
		var t = this._queue[0];
		if(t.StartedResourceGet == false)
		{
			console.log("pre-fetching audio resource for " + t.Title);
			t.Resource = await t.CreateAudioResource();
			console.log("Finished pre-fetch");
		}
		else
		{
			console.log("Next track has already started or made resource");
		}
	}

	private async ProcessQueue(skip:boolean=false): Promise<void>
	{
		//If queue is locked, empty, or currently playing, don't process queue
		if(this._queueLock)
		{
			return;
		}

		if((this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this._queue.length === 0) && skip == false)
		{
			return;
		}

		//Lock queue to prevent modification while processing
		this._queueLock = true;

		var nextTrack = this._queue.shift();
		try
		{
			var resource = null;
			if(nextTrack.Resource == null)
			{
				console.log("Starting create audio resource");
				resource = await nextTrack.CreateAudioResource();
				console.log("Finished create audio resource");
			}
			else
			{
				console.log("Resource already procurred");
				resource = nextTrack.Resource;
			}

			console.log("Starting audio player with new resource: " + this.audioPlayer.state.status);
			this.audioPlayer.play(resource);
			this._currentTrack = nextTrack;
			this._queueLock = false;
		}
		catch(error)
		{
			nextTrack.OnError(error as Error);
			this._queueLock = false;
			//If error occurs, try playing next item in queue
			return this.ProcessQueue();
		}

		//this.FetchNextTrack();
	}
}