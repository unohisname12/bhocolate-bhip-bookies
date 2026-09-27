import {useEffect} from 'react';
import type {Environment} from './model';
/** A quiet generated soundscape: no downloads, autoplay, thunder spikes or persistent contexts. */
export function useWeatherAudio(enabled: boolean, e: Environment, volume: number, visible: boolean) {
 useEffect(()=>{
  if (!enabled || !visible || volume === 0) return;
  const Audio = window.AudioContext;
  if (!Audio) return;
  const ctx = new Audio(), master = ctx.createGain();
  master.gain.value = volume * .12; master.connect(ctx.destination);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), data=buffer.getChannelData(0);let last=0;
  for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3;}
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=e.weather==='rain'?1700:e.weather==='wind'?500:180;
  const gain=ctx.createGain();gain.gain.value=['rain','wind'].includes(e.weather)?1:.13;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start();
  const chirp=()=>{if(ctx.state!=='running'||['rain','wind','snow'].includes(e.weather))return;const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(e.night?2600:1600,t);osc.frequency.exponentialRampToValueAtTime(e.night?2800:2500,t+.12);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.2,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.18);osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+.2);osc.onended=()=>{osc.disconnect();g.disconnect();};};
  const timer=window.setInterval(chirp,e.night?7000:11000);
  void ctx.resume().catch(()=>{});
  return()=>{clearInterval(timer);noise.stop();noise.disconnect();filter.disconnect();gain.disconnect();master.disconnect();void ctx.close().catch(()=>{});};
 },[enabled,visible,volume,e.weather,e.night]);
}
