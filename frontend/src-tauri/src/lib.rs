use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, RunEvent};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct BackendState {
    pub child: Mutex<Option<Child>>,
}

impl BackendState {
    pub fn kill(&self) {
        if let Ok(mut lock) = self.child.lock() {
            if let Some(mut child) = lock.take() {
                let pid = child.id();
                println!("[Desktop] Terminating backend process (PID: {})...", pid);
                #[cfg(windows)]
                {
                    let _ = Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .creation_flags(CREATE_NO_WINDOW)
                        .output();
                }
                let _ = child.kill();
            }
        }
    }
}

fn is_backend_alive(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

fn find_backend_target(app_handle: &tauri::AppHandle) -> Option<(PathBuf, Vec<String>, PathBuf)> {
    let mut candidates = Vec::new();

    // 1. Resource directory candidates (packaged production installer)
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        candidates.push(res_dir.join("resources").join("backend").join("sovereign-backend").join("sovereign-backend.exe"));
        candidates.push(res_dir.join("backend").join("sovereign-backend").join("sovereign-backend.exe"));
        candidates.push(res_dir.join("resources").join("backend").join("sovereign-backend.exe"));
        candidates.push(res_dir.join("backend").join("sovereign-backend.exe"));
    }

    // 2. Current exe directory candidates
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            candidates.push(exe_dir.join("resources").join("backend").join("sovereign-backend").join("sovereign-backend.exe"));
            candidates.push(exe_dir.join("backend").join("sovereign-backend").join("sovereign-backend.exe"));
            candidates.push(exe_dir.join("resources").join("backend").join("sovereign-backend.exe"));
            candidates.push(exe_dir.join("sovereign-backend").join("sovereign-backend.exe"));
            candidates.push(exe_dir.join("sovereign-backend.exe"));
        }
    }

    // Check production candidates
    for candidate in candidates {
        if candidate.is_file() {
            let work_dir = candidate.parent().unwrap().to_path_buf();
            return Some((candidate, vec!["--port".into(), "8000".into()], work_dir));
        }
    }

    // 3. Development Mode: Search upwards for backend/.venv/Scripts/python.exe
    let mut search_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for _ in 0..5 {
        let candidate_backend = search_dir.join("backend");
        let candidate_python = candidate_backend.join(".venv").join("Scripts").join("python.exe");
        if candidate_python.is_file() {
            return Some((
                candidate_python,
                vec![
                    "-u".into(),
                    "-m".into(),
                    "uvicorn".into(),
                    "app.main:app".into(),
                    "--port".into(),
                    "8000".into(),
                ],
                candidate_backend,
            ));
        }
        if let Some(parent) = search_dir.parent() {
            search_dir = parent.to_path_buf();
        } else {
            break;
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(BackendState {
            child: Mutex::new(None),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let state = app.state::<BackendState>();
            if !is_backend_alive(8000) {
                if let Some((exe_path, args, work_dir)) = find_backend_target(app.handle()) {
                    println!("[Desktop] Starting backend: {:?} in {:?}", exe_path, work_dir);
                    let mut cmd = Command::new(&exe_path);
                    let my_pid = std::process::id();
                    let mut final_args = args.clone();
                    final_args.push("--parent-pid".into());
                    final_args.push(my_pid.to_string());
                    cmd.args(&final_args);
                    cmd.current_dir(&work_dir);

                    // Propagate safe writable data directory in production
                    if let Ok(app_data) = app.handle().path().app_data_dir() {
                        let data_dir = app_data.join("data");
                        let _ = std::fs::create_dir_all(&data_dir);
                        cmd.env("SOVEREIGN_DATA_DIR", data_dir);
                    }

                    // Propagate sandbox runner path if found adjacent
                    let runner_candidate = work_dir.join("sovereign-sandbox-runner.exe");
                    if runner_candidate.is_file() {
                        cmd.env("SOVEREIGN_SANDBOX_RUNNER", runner_candidate);
                    } else if let Some(parent) = work_dir.parent() {
                        let runner_candidate2 = parent.join("sovereign-sandbox-runner.exe");
                        if runner_candidate2.is_file() {
                            cmd.env("SOVEREIGN_SANDBOX_RUNNER", runner_candidate2);
                        }
                    }

                    #[cfg(windows)]
                    cmd.creation_flags(CREATE_NO_WINDOW);

                    match cmd.spawn() {
                        Ok(child) => {
                            println!("[Desktop] Backend process successfully launched (PID: {})", child.id());
                            if let Ok(mut lock) = state.child.lock() {
                                *lock = Some(child);
                            }
                        }
                        Err(e) => {
                            eprintln!("[Desktop] Error launching backend process: {}", e);
                        }
                    }
                } else {
                    eprintln!("[Desktop] Warning: Neither production sovereign-backend.exe nor backend/.venv was found.");
                }
            } else {
                println!("[Desktop] Backend service is already alive on port 8000.");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed = event {
                let state = window.state::<BackendState>();
                state.kill();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        match event {
            RunEvent::Exit | RunEvent::ExitRequested { .. } => {
                let state = app_handle.state::<BackendState>();
                state.kill();
            }
            _ => {}
        }
    });
}
