import { logger, remove } from '@/utils'
import { config } from '@/config'
import { sound, Sound, webaudio } from '@pixi/sound'

const TAG = 'SoundManager'
export const VOLUME = 0.5
sound.disableAutoPause = true

/**
 * Manages all the sounds.
 */
export class SoundManager {
  /**
   * Audio elements playing or pending to play. Finished audios will be removed automatically.
   */
  static audios: Sound[] = []
  static analysers: AnalyserNode[] = []
  static contexts: AudioContext[] = []

  protected static _volume = VOLUME

  /**
   * Global volume that applies to all the sounds.
   */
  static get volume(): number {
    return this._volume
  }

  static set volume(value: number) {
    this._volume = (value > 1 ? 1 : value < 0 ? 0 : value) || 0
    this.audios.forEach((audio) => (audio.volume = this._volume))
  }

  // TODO: return an ID?
  /**
   * Creates an audio element and adds it to the {@link audios}.
   * @param file - URL of the sound file.
   * @param onError - Callback invoked when error occurs.
   * @return Created audio element.
   */
  static async add(file: string, onError?: (e: Error) => void): Promise<Sound | null> {
    try {
      const task = new Promise<Sound>((resolve, reject) => {
        const audio = Sound.from({
          url: file,
          volume: this._volume,
          preload: true,
          loaded: () => {
            if (!(audio.media instanceof webaudio.WebAudioMedia)) {
              reject(new Error(`Error: ${file} is not WebAudioMedia`))
            }
            resolve(audio)
          }
        })
      })

      return await task
    } catch (e) {
      logger.warn(TAG, `Error occurred on "${file}"`, e)
      onError?.(e as Error)
      return null
    }
  }

  /**
   * Plays the sound.
   * @param audio - An audio element.
   * @param onFinish - Callback invoked when the playback has finished.
   */
  static play(audio: Sound, onFinish?: () => void): void {
    void audio.play({
      singleInstance: true,
      complete: () => {
        onFinish?.()
        audio.destroy()
      }
    })
  }

  static addAnalyzer(audio: Sound, context: AudioContext): AnalyserNode {
    /* Create an AnalyserNode */
    const media = audio.media as webaudio.WebAudioMedia
    const source = context.createBufferSource()

    source.buffer = media.buffer

    const analyser = context.createAnalyser()

    analyser.fftSize = config.fftSize
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    analyser.smoothingTimeConstant = 0.85

    source.connect(analyser)
    source.start(0)

    this.analysers.push(analyser)
    return analyser
  }

  /**
   * Get volume for lip sync
   * @param analyser - An analyzer element.
   * @return Returns value to feed into lip sync
   */
  static analyze(analyser: AnalyserNode): number {
    if (!analyser) return parseFloat(Math.random().toFixed(1))

    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)

    let sumSquares = 0
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i]! ** 2
    }
    const rms = Math.sqrt(sumSquares / buffer.length)

    const minDecibel = -100
    const db = 20 * Math.log10(rms || 10 ** (minDecibel / 20))

    const scaledDb = Math.min(
      Math.max((db - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels), 0),
      1
    )

    return parseFloat(scaledDb.toFixed(1))
  }

  /**
   * Disposes an audio element and removes it from {@link audios}.
   * @param audio - An audio element.
   */
  static dispose(audio: Sound): void {
    audio.pause()

    remove(this.audios, audio)
  }

  /**
   * Destroys all managed audios.
   */
  static destroy(): void {
    // dispose() removes given audio from the array, so the loop must be backward
    for (let i = this.contexts.length - 1; i >= 0; i--) {
      setTimeout(() => {
        void this.contexts[i]!.close()
      })
    }

    for (let i = this.audios.length - 1; i >= 0; i--) {
      this.dispose(this.audios[i]!)
    }
  }
}
