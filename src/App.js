import {
  IonApp,
  IonButton,
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useRef } from "react";

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
    const y = (v + 140) * 8;
    context.fillRect(x, 0, dx, y);
  });
  context.stroke();
  context.restore();
}

export default function App() {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const audioContextRef = useRef();
  const analyserNodeRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const context = canvas.getContext("2d");
    function render() {
      const analyserNode = analyserNodeRef.current;
      if (analyserNode) {
        const buffer = new Float32Array(analyserNode.frequencyBinCount);
        context.clearRect(0, -canvas.height / 2, canvas.width, canvas.height);
        const width = (canvas.width = wrapper.clientWidth);
        const height = (canvas.height = wrapper.clientHeight);
        analyserNode.getFloatFrequencyData(buffer);
        drawSpectrum(context, width, height, buffer);
        analyserNode.getFloatTimeDomainData(buffer);
        drawWave(context, width, height, buffer);
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
            <IonButton
              className="ion-margin"
              color="light"
              expand="block"
              onClick={async () => {
                const context = new AudioContext();
                const analyserNode = context.createAnalyser();
                analyserNode.fftSize = 2048;
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                });
                const source = context.createMediaStreamSource(stream);
                source.connect(analyserNode);
                audioContextRef.current = context;
                analyserNodeRef.current = analyserNode;
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
