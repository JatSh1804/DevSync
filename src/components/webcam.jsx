import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
}
export const WebcamCapture = ({ audio, camRef, mirrored, ...props }) => {
    // const webcamRef = useRef(null);
    const [video, setVideo] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);

    const capture = useCallback(() => {
        const imageSrc = camRef.current.getScreenshot();
        setImgSrc(imageSrc);
        console.log(imageSrc);
    }, [camRef, setImgSrc]);

    return (
        <>
            {video && <Webcam
                ref={camRef}
                height={'200px'}
                width={'200px'}
                // video={video}
                audio={audio}
                screenshotFormat="image/jpeg"
                mirrored={mirrored}
                videoConstraints={videoConstraints}
                minScreenshotWidth={180}
                minScreenshotHeight={180}
            // {...props}
            />}
            <button onClick={() => { setVideo(!video); console.log(video) }}>Turn on Video</button>
            <button onClick={capture}>Capture Photo</button>
            {imgSrc && <img src={imgSrc} alt="img" />}
        </>
    );
};
