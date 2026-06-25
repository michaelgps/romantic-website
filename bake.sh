#!/usr/bin/env bash
# Bake parchment + ink-bleed reveal + sepia composite for each scene.
# Output: video/<scene>.scene.mp4 (full-bleed; parchment baked in; NO text — text is overlaid by the web player)
set -e
cd "$(dirname "$0")"

# scene:ink-matte:negate(0|1)
PAIRS=(
  "00-meeting:ink-02:0"
  "01-argos:ink-12:1"
  "02-valtan:ink-17:1"
  "03-bloodmoon:ink-18:1"
  "04-cathedral:ink-20:1"
  "05-parting:ink:0"
)

T=7.0   # 每段：~2s 羊皮纸停顿（让文字可读）+ 墨晕开 + 停留

for p in "${PAIRS[@]}"; do
  scn="${p%%:*}"
  rest="${p#*:}"
  ink="${rest%%:*}"
  neg="${rest##*:}"
  negflt=""
  [ "$neg" = "1" ] && negflt="negate,"
  echo ">>> baking $scn  (mask: $ink  negate=$neg)"
  ffmpeg -y -loglevel error -f lavfi -t "$T" -i "color=c=white:s=1280x720:r=30" \
         -loop 1 -t "$T" -i "photos/parchment.png" \
         -i "video/${scn}.mp4" \
         -i "video/${ink}.mp4" \
    -filter_complex "
      [0:v]format=rgba[wht];
      [1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,eq=saturation=0.5:brightness=0.05,format=rgba,colorchannelmixer=aa=0.52[pp];
      [wht][pp]overlay=shortest=1,fps=30,format=rgba,split=2[pa][pb];
      [2:v]scale=1280:720,setsar=1,fps=30,eq=saturation=0.9:contrast=1.01:brightness=0.01,colorbalance=rm=0.03:gm=0.01:bm=-0.02,tpad=start_mode=clone:start_duration=1.8:stop_mode=clone:stop_duration=2,format=rgba[scn];
      [3:v]scale=1280:720,format=gray,${negflt}setsar=1,fps=30,setpts=PTS/1.4,tpad=start_mode=clone:start_duration=1.8:stop_mode=clone:stop_duration=5[msk];
      [scn][msk]alphamerge[rev];
      [pa][rev]overlay=shortest=1[b1];
      [pb]colorchannelmixer=aa=0.10[pf];
      [b1][pf]overlay=shortest=1[out]" \
    -map "[out]" -t "$T" -an -c:v libx264 -pix_fmt yuv420p -crf 21 -preset medium \
    "video/${scn}.scene.mp4"
done
echo "DONE"
