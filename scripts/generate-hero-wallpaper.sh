#!/bin/bash
set -u
W=2560; H=1440; T=/tmp/hero-layers2
step(){ echo "· $1"; }

ridge() {
  awk -v base=$2 -v a1=$3 -v f1=$4 -v a2=$5 -v f2=$6 -v seed=$7 -v W=$W 'BEGIN{
    pts="";
    for(x=0;x<=W;x+=40){
      y=base + a1*sin(x*f1+seed) + a2*sin(x*f2+seed*1.7) + a1*0.55*sin(x*0.019+seed*2.3) + a1*0.25*sin(x*0.045+seed*0.7);
      pts=pts x "," y " ";
    }
    print pts;
  }'
}

step "sky + stars"
convert -size ${W}x${H} gradient:"#05080f"-"#182c4e" $T/sky.png
convert $T/sky.png $T/stars.png -compose Screen -composite $T/acc.png
convert -size ${W}x${H} xc:none $T/base.png
convert $T/base.png $T/acc.png -gravity North -compose Over -composite $T/acc.png

step "moon + halo"
convert -size 700x700 radial-gradient:'rgba(205,220,250,0.4)'-'rgba(205,220,250,0)' $T/halo.png
convert $T/acc.png $T/halo.png -gravity NorthWest -geometry +1560+40 -compose Over -composite $T/acc.png
convert -size ${W}x1150 xc:none -fill '#E9EEF6' -draw "circle 1910,290 1948,290" -blur 0x1 $T/moon.png
convert $T/acc.png $T/moon.png -compose Screen -composite $T/acc.png

step "horizon glow"
convert -size 2200x2200 radial-gradient:'rgba(190,110,70,0.34)'-'rgba(190,110,70,0)' $T/glow.png
convert $T/acc.png $T/glow.png -gravity South -geometry +230+580 -compose Screen -composite $T/acc.png

i=1
for layer in "900 90 0.0035 46 0.012 3 1b2742 2" \
             "990 100 0.0032 54 0.010 8 141d33 1.2" \
             "1085 110 0.0038 62 0.0095 14 0d1526 0.8" \
             "1180 115 0.0042 68 0.013 21 070b14 0.5"; do
  step "ridge layer $i"
  set -- $layer
  PTS=$(ridge 0 $1 $2 $3 $4 $5 $6)
  convert -size ${W}x${H} xc:none -fill "#$7" -draw "polygon $PTS 0,${H} ${W},${H}" -blur 0x$8 $T/l$i.png
  convert $T/acc.png $T/l$i.png -compose Over -composite $T/acc.png
  convert -size ${W}x${H} xc:none -stroke 'rgba(224,206,178,0.65)' -strokewidth 3 -draw "polyline $PTS" -blur 0x1 $T/rim$i.png
  convert $T/acc.png $T/rim$i.png -compose Screen -composite $T/acc.png
  i=$((i+1))
done

step "mist"
convert -size ${W}x300 gradient:'rgba(148,170,210,0)'-'rgba(148,170,210,0.17)' -blur 0x14 $T/mist.png
convert $T/acc.png $T/mist.png -gravity South -geometry +0+300 -compose Over -composite $T/acc.png

step "water + reflection"
convert -size ${W}x290 gradient:'#12203a'-'#2a4066' $T/water.png
convert $T/acc.png -crop ${W}x430+0+715 +repage -flip -blur 0x10 -modulate 75,65 $T/refl.png
convert $T/water.png $T/refl.png -gravity North -compose Over -composite $T/water.png
convert $T/water.png \( -size ${W}x290 xc:none -fill 'rgba(190,215,245,0.16)' -draw "rectangle 350,50 950,57" -draw "rectangle 1400,110 2150,117" -draw "rectangle 800,185 1650,191" -draw "rectangle 1750,235 2350,240" -draw "rectangle 1860,60 1960,240" -blur 0x7 \) -compose Over -composite $T/water.png
convert $T/acc.png $T/water.png -gravity South -compose Over -composite $T/acc.png

step "grain"
convert $T/acc.png \( -size ${W}x${H} xc:gray +noise Gaussian -colorspace Gray -level 47%,53% -channel A -evaluate set 20% +channel \) -compose Overlay -composite $T/acc.png

step "vignette"
convert -size ${W}x${H} radial-gradient:'#FFFFFF'-'#5A5A5A' $T/vig.png
convert $T/acc.png $T/vig.png -compose Multiply -composite $T/acc.png

convert $T/acc.png -quality 88 /tmp/hero-v2.jpg
step "done"
identify /tmp/hero-v2.jpg
