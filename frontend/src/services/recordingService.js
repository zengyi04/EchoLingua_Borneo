import { Audio } from 'expo-av';

let activeRecording = null;
let preparing = false;

export const forceCleanupActiveRecording = async () => {
  if (!activeRecording) {
    return;
  }

  try {
    await activeRecording.stopAndUnloadAsync();
  } catch (error) {
    // Ignore cleanup errors when recording has already stopped.
  }

  activeRecording = null;
};

export const prepareSingleRecording = async () => {
  if (preparing) {
    throw new Error('Recording is still being prepared. Please try again.');
  }

  preparing = true;

  try {
    // Expo allows only one prepared Recording instance at a time.
    await forceCleanupActiveRecording();

    console.log('🎙️ Creating recording with HIGH_QUALITY preset...');
    // Create and start the recording
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      undefined,
      100 // Update interval in milliseconds
    );

    if (!recording) {
      throw new Error('Recording object was not created');
    }

    // Verify recording is actually recording
    const recordingStatus = await recording.getStatusAsync();
    console.log('📊 Recording status:', recordingStatus);
    
    if (!recordingStatus.isRecording) {
      console.log('⚠️ Recording created but not recording, starting now...');
      await recording.startAsync();
      const newStatus = await recording.getStatusAsync();
      console.log('📊 New recording status after start:', newStatus);
    }

    activeRecording = recording;
    console.log('✅ Recording prepared and active');
    return recording;
  } catch (error) {
    console.error('❌ prepareSingleRecording error:', error);
    throw error;
  } finally {
    preparing = false;
  }
};

export const stopAndReleaseRecording = async (recording) => {
  if (!recording) {
    return null;
  }

  try {
    await recording.stopAndUnloadAsync();
  } finally {
    if (activeRecording === recording) {
      activeRecording = null;
    }
  }

  return recording.getURI();
};

export const releaseRecordingReference = (recording) => {
  if (activeRecording === recording) {
    activeRecording = null;
  }
};
