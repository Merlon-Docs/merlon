## GitHub markdown media reference

GitHub renders the following in repository `.md` files (and most GFM viewers). Merlon Docs insert shards are `.md` wrappers that embed each format; guides link to the shard, and `inlineInserts` inlines the body on first mention.

| Kind         | Format                     | GitHub rendering                               | Sample shard                         |
| ------------ | -------------------------- | ---------------------------------------------- | ------------------------------------ |
| Raster image | PNG (`.png`)               | `![alt](path.png)`                             | `../figures/component-map.md`        |
| Raster image | JPEG (`.jpg`, `.jpeg`)     | `![alt](path.jpg)`                             | `../figures/raster-formats.md`       |
| Raster image | GIF (`.gif`)               | `![alt](path.gif)` — animated GIFs play inline | `../figures/raster-formats.md`       |
| Vector image | SVG (`.svg`)               | `![alt](path.svg)` — sanitized on github.com   | `../figures/logo.md`                 |
| Video        | MP4 (`.mp4`, H.264)        | `<video src="…" controls></video>`             | `../media/walkthrough.md`            |
| Video        | MOV (`.mov`)               | Same HTML `<video>` tag                        | upload alongside shard (same as MP4) |
| Audio        | MP3 / WAV (`.mp3`, `.wav`) | `<audio src="…" controls></audio>`             | `../media/chime.md`                  |
| Diagram      | Mermaid                    | `mermaid` fenced code block                    | `../diagrams/service-flow.md`        |
| Table        | GFM pipe table             | Native markdown table                          | `../tables/status-codes.md`          |
| List         | Ordered / unordered        | Native `1.` and `-` lists                      | `../inserts/quick-steps.md`          |
| Flow (text)  | Markdown table             | Native pipe table in a diagram shard           | `../diagrams/request-flow.md`        |

Live compile examples with numbered captions are in the [Insert catalog](#insert-catalog) above.

### Sample asset generation

Minimal binaries in this fixture were generated locally:

- **PNG / GIF / JPEG** — ImageMagick (`magick`) solid-color tiles in `figures/`
- **SVG** — hand-written markup in `figures/logo.svg`
- **MP4** — FFmpeg lavfi color source (`ffmpeg -f lavfi -i color=…`)
- **MP3 / WAV** — FFmpeg sine tone (`ffmpeg -f lavfi -i sine=…`)

Example commands:

```bash
magick -size 120x80 xc:'#0969da' figures/component-map.png
ffmpeg -f lavfi -i color=c=0x0969da:s=320x180:d=1.5 -c:v libx264 -pix_fmt yuv420p media/walkthrough.mp4
ffmpeg -f lavfi -i sine=frequency=523:duration=0.75 -c:a libmp3lame -q:a 9 media/chime.mp3
```

See also [Raster formats](../figures/raster-formats.md) for a shard that embeds PNG, GIF, and JPEG in one insert.
