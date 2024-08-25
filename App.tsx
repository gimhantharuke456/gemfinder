import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import RNFetchBlob from "rn-fetch-blob";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import LottieView from "lottie-react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, CameraView } from "expo-camera";
import { baseUrl } from "./constants";
import axios from "axios";
import * as Progress from "react-native-progress";
import { FlatGrid } from "react-native-super-grid";
const height: number = Dimensions.get("window").height;
const width: number = Dimensions.get("window").width;
interface ImageData {
  url: string;
}

interface ApiResponse {
  created: number;
  data: ImageData[];
}
function extractImageUrls(response: ApiResponse): string[] {
  const urls = response.data.map((imageData) => imageData.url);
  return urls;
}
export default function App(): JSX.Element {
  const [fontsLoaded]: [boolean, Error] = useFonts({
    // Arial: require("./assets/fonts/Arial.ttf"),
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cuttedImages, setCuttedImages] = useState([]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    (async () => {
      let permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        alert("Permission to access camera roll is required!");
        return;
      }
    })();
  }, []);

  if (!fontsLoaded) {
    return null;
  }
  const pickImage = async () => {
    setImage(null);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  const pickFromCamera = async () => {
    setImage(null);
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  const onIdentify = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: image,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);

      await axios
        .post(`${baseUrl}/predict`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then(async (response) => {
          setResult(response.data);
          if (response.data.response) {
            const result = await axios.post(`${baseUrl}/generate-image`, {
              prompt:
                "heart shape single gemstone. gem is look like " +
                response.data.response,
            });

            setCuttedImages(result.data.names);
          }
        })
        .catch((error) => {
          console.log("Upload Error", error);
        });
    } catch (error) {
      console.error(`error predicting: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  const repredict = () => {
    setImage(null);
    setLoading(false);
    setResult(null);
    setCuttedImages([]);
  };
  const imageSize = {
    width: width / 2 - 20,
    height: (height - 200) / 2 - 20,
  };
  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.productImage}>
          <LottieView
            source={require("./assets/loading.json")}
            autoPlay
            loop
            style={styles.animation}
          />
          <Text style={{ color: "black", fontSize: 18 }}>Predicting ...</Text>
        </View>
      </ScrollView>
    );
  }

  if (result) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.productImage}>
          {image && (
            <Image
              source={{ uri: image }}
              style={{
                width: width,
                height: cuttedImages ? 400 : height - 200,
                borderRadius: 10,
              }}
            />
          )}
        </View>
        <View style={styles.resultContainer}>
          <Text
            style={{
              color: "black",
              fontSize: 18,
              paddingHorizontal: 20,
              textAlign: "center",
            }}
          >
            {`Predicted as ${
              result.class_name?.split(" ")[1].toUpperCase() ?? "No result"
            } with confidence score of ${Number(
              result.confidence_score.toFixed(2)
            )}`}
          </Text>
          <DynamicProgressBar progress={result.confidence_score ?? 0} />
          {cuttedImages.length > 0 && (
            <Text
              style={{
                color: "black",
                fontSize: 18,
                paddingHorizontal: 20,
                textAlign: "center",
              }}
            >
              This Gemstone can cut like below suggesions
            </Text>
          )}
          {cuttedImages.length > 0 && (
            <View style={{ height: 300, width: width }}>
              {cuttedImages.map((image, index) => (
                <Image
                  source={{ uri: `${baseUrl}/images/${image}` }}
                  style={{ width: width / 3, height: 130 }}
                  contentFit="cover"
                  transition={1000}
                  key={index}
                />
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={repredict}
            style={[
              styles.button,
              styles.identifyButton,
              {
                width: width - 20,
                marginBottom: 32,
                height: 54,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ color: "white" }}>Repredict</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!image && (
        <CameraView
          style={{ height: height - 200, width: width }}
          facing="back"
        >
          <View style={styles.productImage}></View>
        </CameraView>
      )}
      {image && <ProductImage image={image} Camera={Camera} />}
      <Buttons
        image={image}
        onTakePicture={pickFromCamera}
        onPickFromGallery={pickImage}
        onIdentify={onIdentify}
      />
    </ScrollView>
  );
}

function ProductImage({ image, Camera }): JSX.Element {
  return (
    <View style={styles.productImage}>
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: width, height: height - 200, borderRadius: 10 }}
        />
      )}
    </View>
  );
}

function Buttons({
  onTakePicture,
  onPickFromGallery,
  image,
  onIdentify,
}): JSX.Element {
  return (
    <View style={styles.buttonContainer}>
      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={onTakePicture}
          style={[styles.button, styles.takePictureButton]}
        >
          <Text>Take Picture</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPickFromGallery}
          style={[styles.button, styles.identifyButton]}
        >
          <Text style={{ color: "white" }}>Pick From Gallery</Text>
        </TouchableOpacity>
      </View>
      {image && (
        <TouchableOpacity
          onPress={onIdentify}
          style={[styles.button, styles.identifyButton, { width: "100%" }]}
        >
          <Text style={{ color: "white" }}>Identify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const DynamicProgressBar = ({ progress }) => {
  return (
    <Progress.Bar
      progress={progress}
      color="#ADD8E6"
      width={width - 20}
      style={{ marginVertical: 16 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    display: "flex",
    height: height,
    flexDirection: "column",
  },
  productImage: {
    alignItems: "center",
    marginVertical: 20,
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  button: {
    width: "48%",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  takePictureButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "black",
  },
  identifyButton: {
    backgroundColor: "black",
  },
  buttonContainer: {
    height: 140,
    paddingHorizontal: 20,
  },
  animation: {
    width: 200,
    height: 200,
  },
  resultContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    width: width,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "auto",
    height: "100%",
    aspectRatio: 1, // Maintain aspect ratio, adjust as needed
    borderRadius: 10,
    margin: 10,
  },
});
