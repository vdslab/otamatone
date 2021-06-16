import {
  IonApp,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonPage,
  IonRange,
  IonSplitPane,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useRef, useState } from "react";

function drawWave(context, width, height, buffer) {
  const dx = width / buffer.length;
  context.save();
  context.translate(0, height / 2);
  context.scale(1, -1);
  context.strokeStyle = "white";
  context.lineWidth = 3;
  context.beginPath();
  buffer.forEach((v, i) => {
    const x = dx * i;
    const y = (v * height) / 2;
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
  context.restore();
}

function drawSpectrum(context, width, height, buffer) {
  const dx = width / buffer.length;
  context.save();
  context.translate(0, height);
  context.scale(1, -1);
  context.fillStyle = "blue";
  context.beginPath();
  buffer.forEach((v, i) => {
    const x = dx * i;
    const y = (1 + v / 128) * height;
    context.fillRect(x, 0, dx, y);
  });
  context.stroke();
  context.restore();
}

export default function App() {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const audioRef = useRef();
  const [delay, setDelay] = useState(0.25);
  const [feedback, setFeedback] = useState(0.4);
  const [mix, setMix] = useState(0.4);

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
          const buffer = new Float32Array(analyserNode.frequencyBinCount);
          analyserNode.getFloatFrequencyData(buffer);
          drawSpectrum(context, width, height, buffer);
          analyserNode.getFloatTimeDomainData(buffer);
          drawWave(context, width, height, buffer);
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
                const context = new AudioContext();
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
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                });
                const source = context.createMediaStreamSource(stream);
                source.connect(inputGainNode);
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
            <IonToolbar></IonToolbar>
          </IonHeader>
          <IonContent ref={wrapperRef}>
            <canvas ref={canvasRef} />
          </IonContent>
        </IonPage>
      </IonSplitPane>
    </IonApp>
  );
}
