use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

struct AudioState {
    stream: Option<cpal::Stream>,
}

#[tauri::command]
fn start_audio_capture(app: AppHandle) -> Result<String, String> {
    let host = cpal::default_host();
    let device = host.default_input_device().ok_or("No input device found")?;
    let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());

    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Default,
    };

    let app_handle = app.clone();

    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let samples: Vec<i16> = data.iter().map(|&s| (s * 32767.0) as i16).collect();
                let bytes: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
                let _ = app_handle.emit("audio-data", bytes);
            },
            |err| { eprintln!("[Audio] Stream error: {}", err); },
            None,
        )
        .map_err(|e| format!("Failed to build stream: {}", e))?;

    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;

    let state = app.state::<Arc<Mutex<AudioState>>>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.stream = Some(stream);

    Ok(format!("Capturing from: {}", device_name))
}

#[tauri::command]
fn stop_audio_capture(app: AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<Mutex<AudioState>>>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.stream = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(Mutex::new(AudioState { stream: None })))
        .invoke_handler(tauri::generate_handler![start_audio_capture, stop_audio_capture])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
