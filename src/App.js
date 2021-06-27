import {
  IonApp,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonPage,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonSplitPane,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useRef, useState } from "react";

function drawWave(context, width, height, buffer, color) {
  const maxR = Math.min(width, height) / 2;
  context.save();
  context.translate(width / 2, height / 2);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  buffer.forEach((v, i) => {
    const t = (Math.PI * 2 * i) / buffer.length;
    const r = maxR * ((2 * v) / 255 - 1) + maxR / 2;
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();
  context.stroke();
  context.restore();
}

function drawSpectrum(context, width, height, buffer, color) {
  const maxR = Math.min(width, height);
  const dt = (2 * Math.PI) / buffer.length;
  context.save();
  context.translate(width / 2, height / 2);
  context.fillStyle = color;
  buffer.forEach((v, i) => {
    const t = dt * i;
    const r = (v / 255) * maxR;
    const x1 = r * Math.cos(t);
    const y1 = r * Math.sin(t);
    const x2 = r * Math.cos(t + dt);
    const y2 = r * Math.sin(t + dt);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.fill();
  });
  context.restore();
}

function getColor(buffer) {
  let maxIndex = 0;
  for (let i = 1; i < buffer.length; ++i) {
    if (buffer[i] > buffer[maxIndex]) {
      maxIndex = i;
    }
  }
  const threshold = 50;
  let count = 0;
  for (const v of buffer) {
    if (v > threshold) {
      count += 1;
    }
  }
  count /= buffer.length;
  return `hsl(${240 - Math.min(1, count * 1.5) * 240},100%,50%)`;
}

export default function App() {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const audioRef = useRef();
  const [filterType, setFilterType] = useState("allpass");
  const [delay, setDelay] = useState(0.25);
  const [feedback, setFeedback] = useState(0.4);
  const [mix, setMix] = useState(0.4);

  const filterTypes = [
    "lowpass",
    "highpass",
    "bandpass",
    "lowshelf",
    "highshelf",
    "peaking",
    "notch",
    "allpass",
  ];

  useEffect(() => {
    function render() {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (canvas && wrapper) {
        const context = canvas.getContext("2d");
        context.clearRect(0, -canvas.height / 2, canvas.width, canvas.height);
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        if (audioRef.current) {
          const width = canvas.width;
          const height = canvas.height;
          const { analyserNode } = audioRef.current;
          const buffer = new Uint8Array(analyserNode.frequencyBinCount);
          analyserNode.getByteFrequencyData(buffer);
          const color = getColor(buffer);
          drawSpectrum(context, width, height, buffer, color);
          analyserNode.getByteTimeDomainData(buffer);
          drawWave(context, width, height, buffer, "white");
        }
      }
      requestAnimationFrame(render);
    }
    render();
  }, []);
  return (
    <IonApp>
      <IonSplitPane contentId="main">
        <IonMenu contentId="main">
          <IonHeader>
            <IonToolbar></IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel>BiquadFilter</IonLabel>
                <IonSelect
                  interface="popover"
                  value={filterType}
                  onIonChange={(event) => {
                    const filterType = event.target.value;
                    setFilterType(filterType);
                    if (audioRef.current) {
                      audioRef.current.biquadFilterNode.type = filterType;
                    }
                  }}
                >
                  {filterTypes.map((item) => {
                    return (
                      <IonSelectOption key={item} value={item}>
                        {item}
                      </IonSelectOption>
                    );
                  })}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Delay</IonLabel>
                <IonRange
                  value={delay}
                  min="0"
                  max="1"
                  step="0.01"
                  onIonChange={(event) => {
                    const delay = +event.target.value;
                    setDelay(delay);
                    if (audioRef.current) {
                      audioRef.current.delayNode.delayTime.value = delay;
                    }
                  }}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Feedback</IonLabel>
                <IonRange
                  value={feedback}
                  min="0"
                  max="1"
                  step="0.01"
                  onIonChange={(event) => {
                    const feedback = +event.target.value;
                    setFeedback(delay);
                    if (audioRef.current) {
                      audioRef.current.feedbackGainNode.gain.value = feedback;
                    }
                  }}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Mix</IonLabel>
                <IonRange
                  value={mix}
                  min="0"
                  max="1"
                  step="0.01"
                  onIonChange={(event) => {
                    const mix = +event.target.value;
                    setMix(mix);
                    if (audioRef.current) {
                      audioRef.current.wetGainNode.gain.value = mix;
                      audioRef.current.dryGainNode.gain.value = 1 - mix;
                    }
                  }}
                />
              </IonItem>
            </IonList>
            <IonButton
              className="ion-margin"
              color="light"
              expand="block"
              onClick={async () => {
                const context = new (AudioContext ||
                  window.webkitAudioContext)();
                const biquadFilterNode = context.createBiquadFilter();
                biquadFilterNode.type = filterType;
                const inputGainNode = context.createGain();
                const delayNode = context.createDelay();
                delayNode.delayTime.value = delay;
                const wetGainNode = context.createGain();
                wetGainNode.gain.value = mix;
                const dryGainNode = context.createGain();
                dryGainNode.gain.value = 1 - mix;
                const feedbackGainNode = context.createGain();
                feedbackGainNode.gain.value = feedback;
                const outputGainNode = context.createGain();
                const analyserNode = context.createAnalyser();
                analyserNode.fftSize = 2048;
                analyserNode.smoothingTimeConstant = 0.85;
                analyserNode.minDecibels = -90;
                analyserNode.maxDecibels = -10;
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                });
                const source = context.createMediaStreamSource(stream);
                source.connect(biquadFilterNode).connect(inputGainNode);
                inputGainNode
                  .connect(delayNode)
                  .connect(wetGainNode)
                  .connect(outputGainNode);
                delayNode.connect(feedbackGainNode).connect(delayNode);
                inputGainNode.connect(dryGainNode).connect(outputGainNode);
                outputGainNode
                  .connect(analyserNode)
                  .connect(context.destination);
                audioRef.current = {
                  context,
                  biquadFilterNode,
                  inputGainNode,
                  delayNode,
                  wetGainNode,
                  dryGainNode,
                  feedbackGainNode,
                  outputGainNode,
                  analyserNode,
                };
              }}
            >
              start
            </IonButton>
          </IonContent>
        </IonMenu>
        <IonPage id="main">
          <IonHeader>
            <IonToolbar>
              <IonButtons>
                <IonMenuButton></IonMenuButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent ref={wrapperRef}>
            <canvas ref={canvasRef} />
          </IonContent>
        </IonPage>
      </IonSplitPane>
    </IonApp>
  );
}
