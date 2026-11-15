# Audio Player

A small audio player: a Play and Pause button, a seek slider on the [Slider Field](slider-field.md), and the current and total time, under an optional title. Only one player plays at a time on the page.

## Decision

| When | Use |
| :--- | :--- |
| Previewing a short sound, such as a theme song | Audio Player |
| Video or a long playlist | Not the Audio Player |

## Usage

```js
import { createAudioPlayer } from './configurationpage?name=myplugin_jpkribs_shared.js';

var player = createAudioPlayer({ title: 'theme.mp3', src: themeUrl });
view.querySelector('#themeHost').appendChild(player.element);
```

Classes: `base-audio-player`, with the `playing` modifier, and the parts `base-audio-player-toggle`, `base-audio-player-body`, `base-audio-player-title`, `base-audio-player-line`, and `base-audio-player-time`. The handle is `{ element, audio, getValue, setValue, play, pause, destroy }`, where `getValue()` returns the source and `setValue(src)` loads another.

## States and Modifiers

* The button is a `base-button` with the `field` modifier, so it is a field tall. It shows `play_arrow` or `pause`, with `playText` ("Play") or `pauseText` ("Pause") as its title and name. `playing` is on the root while it plays.
* Starting a player pauses the one that was playing. `onPlay` runs when it starts, and `onPause` when it pauses or ends.
* The player is a group named by `label`, the title by default, else "Audio".
* The slider's value text reads the time, such as "0:42 of 3:05", and `seekText` ("Seek") names it.
* A source that cannot load shows "Could not load the audio." in red in the title's place, which `errorText` replaces, and the button turns into an X, so the player keeps its height. Pressing the X, named by `resetText` ("Reset"), clears the error, brings the title back, and loads the audio again.
* `size` is `small`, `medium` (default), or `large`.

## Gotchas

* Call `destroy()` when the page hides. It pauses the audio.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createAudioPlayer`

<code>function createAudioPlayer(options?: AudioPlayerOptions): AudioPlayerHandle</code>

A small audio player: a Play and Pause button, a seek slider on the Slider Field, and the current and total time, beside an optional title. Only one player plays at a time on the page, so starting one pauses the one before. The slider reads the time as its value text. When the audio cannot load, the error takes the title's place in red and the button turns into an X, so nothing on the page moves. Pressing the X clears the error, brings the title back, and loads the audio again.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `src` | <code>string</code> | address of the audio [optional] |
| `title` | <code>string</code> | the name shown beside the controls, such as a theme song's file name [optional] |
| `label` | <code>string</code> | the player's accessible name (default the title, else 'Audio') |
| `playText` | <code>string</code> | the play button's title and aria-label (default 'Play') |
| `pauseText` | <code>string</code> | the pause button's title and aria-label (default 'Pause') |
| `seekText` | <code>string</code> | the slider's aria-label (default 'Seek') |
| `errorText` | <code>string</code> | the text in the title's place when the audio cannot load (default 'Could not load the audio.') |
| `resetText` | <code>string</code> | the X button's title and aria-label after an error (default 'Reset') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its controls (default 'medium') |
| `onPlay` | <code>(): void</code> | function() called when it starts to play [optional] |
| `onPause` | <code>(): void</code> | function() called when it pauses or ends [optional] |

| Handle member | Type |
| :--- | :--- |
| `audio` | <code>HTMLAudioElement</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(src: string &#124; null): void</code> |
| `play` | <code>(): void</code> |
| `pause` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-audio-player` | A small audio player: a Play and Pause button a field tall, then the title over a seek slider and the current and total time |
| `base-audio-player.failed` | A player whose audio could not load: the error in red in the title's place, and the button an X that resets it |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/audio-player.html" title="Audio Player example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "audio-player.html"
```
