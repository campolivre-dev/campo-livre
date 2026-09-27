function Building({ x, y, width, depth, height, light = false }: { x: number; y: number; width: number; depth: number; height: number; light?: boolean }) {
  const dx = depth * .85;
  const dy = depth * .48;
  const wy = width * .48;
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M0 0 ${width} ${wy} ${width} ${wy - height} 0 ${-height}Z`} fill={light ? '#bdd2b5' : '#658777'} />
    <path d={`M${width} ${wy} ${width + dx} ${wy - dy} ${width + dx} ${wy - dy - height} ${width} ${wy - height}Z`} fill={light ? '#809f89' : '#426857'} />
    <path d={`M0 ${-height} ${dx} ${-dy - height} ${width + dx} ${wy - dy - height} ${width} ${wy - height}Z`} fill={light ? '#dce6cd' : '#a2bca5'} />
    {[.2, .4, .6, .8].map(r => <path key={r} d={`M${width * r} ${width * r * .48 - height + 12}v${Math.max(8, height - 22)}`} stroke="#294f41" opacity=".55" strokeWidth="4" />)}
  </g>;
}

export function PlantIllustration() {
  return <div className="plant-scene">
    <div className="scene-topline"><span><i /> VISÃO DO CAMPO</span><span>UNIDADE DEMONSTRATIVA</span></div>
    <svg viewBox="0 0 620 360" className="plant" role="img" aria-labelledby="plant-title">
      <title id="plant-title">Ilustração de uma planta industrial fictícia com galpões, árvores e pontos de atividade.</title>
      <defs>
        <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .48 -.85 .48 310 0)"><path d="M34 0H0V34" fill="none" stroke="#92ad91" strokeWidth=".6" opacity=".2" /></pattern>
        <radialGradient id="glow"><stop stopColor="#8faa80" stopOpacity=".18" /><stop offset="1" stopColor="#8faa80" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="320" cy="200" rx="300" ry="160" fill="url(#glow)" />
      <path d="M35 177 293 42 595 187 337 333Z" fill="url(#grid)" />
      <path d="m94 188 200-106 247 119-201 106Z" fill="#365645" stroke="#779077" strokeWidth="1" />
      <path d="m94 188 246 119 201-106v9L340 317 94 198Z" fill="#203e31" />
      <path d="m114 201 202-107m-70 178 201-107M192 143l250 121" stroke="#81947b" strokeWidth="19" />
      <path d="m114 201 202-107m-70 178 201-107M192 143l250 121" stroke="#d2d7ae" strokeWidth="1" strokeDasharray="7 7" />
      <Building x={209} y={132} width={95} depth={61} height={57} light />
      <Building x={354} y={202} width={90} depth={53} height={45} light />
      <Building x={174} y={218} width={50} depth={44} height={37} />
      <Building x={291} y={264} width={40} depth={39} height={26} />
      {[0, 1, 2].map(i => <g key={i} transform={`translate(${385 + i * 27} ${128 + i * 13})`}><path d="M-13 0v30c0 10 26 10 26 0V0" fill="#8faa95" /><ellipse rx="13" ry="7" fill="#c7d6bd" /><path d="M-13 19c0 9 26 9 26 0" fill="none" stroke="#526f5b" /></g>)}
      {[[144,174],[167,160],[468,224],[491,211],[372,281],[394,268],[270,101]].map(([x,y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><path d="M0 0v-19" stroke="#a7b594" strokeWidth="3" /><path d="m0-47-12 26h24Z" fill="#86a078" /><path d="m0-38-15 25h30Z" fill="#63865f" /></g>)}
      <g className="map-marker" transform="translate(283 83)"><path d="M0 0v-25" stroke="#d8f3a2" strokeDasharray="3 3" /><circle cy="-34" r="13" fill="#d8f3a2" /><path d="m-5-34 4 4 6-7" fill="none" stroke="#294e38" strokeWidth="2" /></g>
      <g className="map-marker second-marker" transform="translate(412 164)"><path d="M0 0v-24" stroke="#e7bf7a" strokeDasharray="3 3" /><circle cy="-33" r="11" fill="#e7bf7a" /><path d="M0-38v6m0 3v1" stroke="#604826" strokeWidth="2" /></g>
      <g transform="translate(245 231)"><circle r="13" fill="#cbeaa0" opacity=".15" /><circle r="6" fill="#d0ed9e" stroke="#254b38" strokeWidth="2" /></g>
    </svg>
    <div className="scene-caption"><span className="legend-dot" /> Pessoas, equipamentos e atividades conectados.</div>
  </div>;
}
