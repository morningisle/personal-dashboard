from PIL import Image
import os

files = ['icon.jpg', 'mood-happy.jpg', 'mood-content.jpg', 'mood-flat.jpg', 'mood-sad.jpg', 'mood-angry.jpg', 'mood-confused.jpg']

for f in files:
    if os.path.exists(f):
        img = Image.open(f)
        img = img.convert('RGBA')
        datas = img.getdata()
        
        newData = []
        for item in datas:
            r, g, b, a = item
            # 更激进的阈值：RGB 都大于 180 就视为背景
            if r > 180 and g > 180 and b > 180:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        
        img.putdata(newData)
        png_name = f.replace('.jpg', '.png')
        img.save(png_name, 'PNG')
        print(f'Converted {f} -> {png_name} with threshold 180')
    else:
        print(f'File not found: {f}')
