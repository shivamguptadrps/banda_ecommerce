import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCreateReturnRequestMutation } from "@/store/api/returnApi";
import { useUploadReturnRequestImagesMutation } from "@/store/api/uploadApi";
import { ReturnReason } from "@/types/return";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const RETURN_REASONS: { value: ReturnReason; label: string; icon: string }[] = [
  { value: "damaged", label: "Damaged Product", icon: "warning-outline" },
  { value: "wrong_item", label: "Wrong Item", icon: "swap-horizontal-outline" },
  { value: "quality", label: "Quality Issue", icon: "star-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export default function ReturnRequestScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId, orderItemId, productName } = route.params;

  const [selectedReason, setSelectedReason] = useState<ReturnReason | null>(null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]); // Local URIs before upload
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [createReturnRequest, { isLoading }] = useCreateReturnRequestMutation();
  const [uploadImages] = useUploadReturnRequestImagesMutation();

  const handleImagePicker = async () => {
    if (imageUris.length >= 5) {
      Alert.alert("Limit Reached", "You can upload maximum 5 images");
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera roll permissions to upload images");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        
        // Add to local URIs (for display)
        setImageUris([...imageUris, localUri]);
        
        // Upload to backend immediately
        await uploadImageToBackend(localUri);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      console.error("Image picker error:", error);
    }
  };

  const uploadImageToBackend = async (localUri: string) => {
    try {
      setIsUploadingImages(true);
      
      // Create FormData
      const formData = new FormData();
      
      // Get filename from URI
      const filename = localUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      
      // Append file to FormData
      formData.append("files", {
        uri: localUri,
        name: filename,
        type: type,
      } as any);
      
      // Upload to backend
      const uploadedUrls = await uploadImages(formData).unwrap();
      
      if (uploadedUrls && uploadedUrls.length > 0) {
        // Add uploaded URL to images array
        setImages([...images, uploadedUrls[0]]);
      } else {
        // Remove from local URIs if upload failed
        setImageUris(imageUris.filter((uri) => uri !== localUri));
        Alert.alert("Upload Failed", "Failed to upload image. Please try again.");
      }
    } catch (error: any) {
      // Remove from local URIs if upload failed
      setImageUris(imageUris.filter((uri) => uri !== localUri));
      Alert.alert(
        "Upload Failed",
        error?.data?.detail || "Failed to upload image. Please try again."
      );
      console.error("Image upload error:", error);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageUris(imageUris.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Required", "Please select a return reason");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      Alert.alert(
        "Description Required",
        "Please provide a detailed description (minimum 10 characters)"
      );
      return;
    }

    try {
      await createReturnRequest({
        orderId,
        data: {
          order_item_id: orderItemId,
          reason: selectedReason,
          description: description.trim(),
          images: images.length > 0 ? images : undefined,
        },
      }).unwrap();

      Alert.alert(
        "Success",
        "Return request submitted successfully. The vendor will review your request.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.data?.detail || "Failed to submit return request. Please try again."
      );
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Return</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Product Info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product</Text>
            <Text style={styles.productName}>{productName}</Text>
          </View>

          {/* Return Reason */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Reason for Return <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.reasonsContainer}>
              {RETURN_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.value && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={20}
                    color={selectedReason === reason.value ? "#7B2D8E" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reason.value && styles.reasonTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {selectedReason === reason.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#7B2D8E" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>
              Please provide details about why you want to return this item (minimum 10 characters)
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the issue..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {description.length}/500 characters
            </Text>
          </View>

          {/* Images */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Images (Optional)</Text>
            <Text style={styles.helperText}>
              Upload up to 5 images to support your return request
            </Text>
            <View style={styles.imagesContainer}>
              {imageUris.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  {images[index] ? (
                    // Show uploaded image
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="checkmark-circle" size={32} color="#059669" />
                      <Text style={styles.uploadedText}>Uploaded</Text>
                    </View>
                  ) : (
                    // Show uploading state
                    <View style={styles.imagePlaceholder}>
                      <ActivityIndicator size="small" color="#7B2D8E" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    disabled={isUploadingImages}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
              {imageUris.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImagePicker}
                  disabled={isUploadingImages}
                >
                  <Ionicons name="add-circle-outline" size={32} color="#7B2D8E" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.card, styles.infoCard]}>
            <Ionicons name="information-circle" size={20} color="#7B2D8E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                • Your return request will be reviewed by the vendor{"\n"}
                • If approved, you'll receive a refund{"\n"}
                • The vendor may contact you for more details
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            onPress={handleSubmit}
            disabled={
              isLoading ||
              isUploadingImages ||
              !selectedReason ||
              description.trim().length < 10
            }
            style={styles.submitButton}
          >
            {isLoading || isUploadingImages ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Return Request</Text>
              </>
            )}
          </Button>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  required: {
    color: "#DC2626",
  },
  productName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  reasonsContainer: {
    gap: 10,
  },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  reasonButtonSelected: {
    borderColor: "#7B2D8E",
    backgroundColor: "#F3E8FF",
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  reasonTextSelected: {
    color: "#7B2D8E",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
    lineHeight: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 120,
    backgroundColor: "#FFFFFF",
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "right",
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  imageWrapper: {
    position: "relative",
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#7B2D8E",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  uploadedText: {
    fontSize: 10,
    color: "#059669",
    marginTop: 4,
    fontWeight: "600",
  },
  uploadingText: {
    fontSize: 10,
    color: "#7B2D8E",
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F3E8FF",
    borderColor: "#7B2D8E",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7B2D8E",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

