import subprocess
import os
import shutil

def extract_frames(input_path, output_dir):
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    subprocess.run([
        'magick', input_path, '-coalesce',
        os.path.join(output_dir, 'frame_%03d.png')
    ])
