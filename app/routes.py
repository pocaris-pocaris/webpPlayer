from flask import Blueprint, render_template, request, jsonify
from .converter import extract_frames
import os
import shutil

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    save_flag = request.form.get('save', 'false') == 'true'

    input_path = 'app/static/input.webp'
    output_dir = 'app/static/frames'
    file.save(input_path)

    extract_frames(input_path, output_dir)

    frame_files = sorted(f for f in os.listdir(output_dir) if f.endswith('.png'))
    return jsonify({
        'frame_count': len(frame_files),
        'frame_urls': [f'/static/frames/{f}' for f in frame_files]
    })


@main.route('/cleanup', methods=['POST'])
def cleanup():
    frame_dir = os.path.join('app', 'static', 'frames')
    if os.path.exists(frame_dir):
        shutil.rmtree(frame_dir)
        os.makedirs(frame_dir, exist_ok=True)
        return jsonify({"status": "deleted"})
    return jsonify({"status": "not_found"})