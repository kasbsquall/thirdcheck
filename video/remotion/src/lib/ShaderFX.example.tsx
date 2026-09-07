import {AbsoluteFill, useCurrentFrame, continueRender, delayRender} from 'remotion';
import React from 'react';

// PASO 3 DEL EXPERIMENTO: ¿puede un efecto WebGL ser DETERMINISTA dentro de Remotion?
//
// Es la pregunta que decide para toda la familia *Object de canvasui (ASCII / Dithered /
// Glass / Particle / Liquid Object), que es la unica parte de esa libreria que sobrevive:
// opera sobre un GLB, un SVG o una imagen, no sobre HTML en vivo, asi que no necesita la
// API html-in-canvas que este Chrome no tiene.
//
// Los efectos de la libreria se conducen por posicion del raton y por requestAnimationFrame.
// Ninguna de las dos cosas existe aqui: no hay cursor, y Remotion pinta los fotogramas EN
// PARALELO y FUERA DE ORDEN, saltando a cualquier frame. Un shader que lea el reloj del
// sistema devuelve una imagen distinta cada vez que se pinta el mismo fotograma.
//
// Asi que el driver se sustituye: el tiempo es `useCurrentFrame()` y el "cursor" es una
// trayectoria derivada de ese mismo frame. Si eso basta, el efecto es reproducible.
//
// LA PRUEBA es pintar el MISMO fotograma dos veces y comparar los pixeles. Si no salen
// identicos byte a byte, el efecto no sirve para video por muy bonito que se vea en el
// navegador: cada re-render daria un resultado distinto y no habria forma de iterar.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

// Un campo de ruido animado, del tipo que usan estos efectos por debajo. Lo unico que entra
// desde fuera es u_t (el frame) y u_m (el "cursor" derivado del frame). Sin time(), sin
// random(), sin estado entre fotogramas.
const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_t; uniform vec2 u_m;
float hash(vec2 v){ return fract(sin(dot(v, vec2(12.9898,78.233))) * 43758.5453); }
float noise(vec2 v){
  vec2 i = floor(v), f = fract(v);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float d = distance(uv, u_m);
  float n = noise(uv * 9.0 + u_t * 0.05) * 0.6 + noise(uv * 26.0 - u_t * 0.02) * 0.4;
  float ring = smoothstep(0.34, 0.0, abs(d - mod(u_t * 0.006, 0.6)));
  vec3 col = mix(vec3(0.04,0.05,0.09), vec3(0.18,0.79,0.55), n * 0.75 + ring * 0.6);
  gl_FragColor = vec4(col, 1.0);
}`;

export const ProbeGL: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [handle] = React.useState(() => delayRender('probe-gl'));

  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext('webgl', {preserveDrawingBuffer: true});
    if (!gl) return continueRender(handle);

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), cv.width, cv.height);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_t'), frame);
    // el "cursor", derivado del frame en vez de leerse del raton
    gl.uniform2f(
      gl.getUniformLocation(prog, 'u_m'),
      0.5 + 0.28 * Math.cos(frame / 40),
      0.5 + 0.20 * Math.sin(frame / 33)
    );

    gl.viewport(0, 0, cv.width, cv.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
    continueRender(handle);
  }, [frame, handle]);

  return (
    <AbsoluteFill style={{background: '#0B0D12'}}>
      <canvas ref={ref} width={1920} height={1080} style={{width: '100%', height: '100%'}} />
      <div
        style={{position: 'absolute', left: 40, top: 34, fontFamily: 'monospace', fontSize: 30, color: '#fff'}}
      >
        webgl determinista · frame {frame}
      </div>
    </AbsoluteFill>
  );
};
