interface FrameOpening {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<[number, number]>;
}

const region = (width: number, height: number, points: Array<[number, number]>): FrameOpening => {
  const normalized = points.map(([x, y]): [number, number] => [x / width, y / height]);
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), points: normalized };
};

// Measured against the original catalog assets, independent of display size.
// Polygons keep angled frame edges and surrounding scenes outside the photo.
const openings: Record<string, FrameOpening[]> = {
  // Modern Family Frame - Test: inside the angled silver frame, not its metal surround.
  'be1cdb03-b694-4d16-b593-c592ad3417f6.jpg': [region(1343, 1500, [[496, 299], [984, 264], [1074, 1121], [589, 1184]])],
  'd10644f1-e40e-4544-acf6-f2f764bd1d04.png': [{ x: 0.216, y: 0.154, width: 0.484, height: 0.64 }],
  'ff3e0365-f21c-4953-8b53-4023e1fd2cc2.jpeg': [region(832, 846, [[185, 89], [628, 91], [628, 700], [178, 700]])],
  '87576780-7b6f-4217-be7a-08a74ddbc510.jpeg': [region(846, 846, [[308, 281], [539, 283], [531, 612], [298, 610]])],
  '740f56c4-5cd5-4198-80f5-c21f20fd339f.jpeg': [region(700, 700, [[177, 105], [522, 105], [522, 595], [177, 595]])],
  'd5aec816-f558-4101-a450-c954228b8cd3.jpg': [region(1600, 1600, [[460, 286], [1209, 286], [1209, 1398], [460, 1398]])],
  'dc7f5aa0-5edf-4290-ad85-a26cdedf6cb0.jpg': [region(626, 487, [[287, 143], [389, 143], [389, 355], [287, 355]])],
  // Nested frames: only the unobstructed opening of the foreground frame.
  '8500a45b-3027-4cd0-bf69-b75da4f96c48.jpg': [region(728, 408, [[312, 220], [404, 220], [404, 329], [312, 329]])],
  // Gallery-wall scene: preserve the wooden panels and replace existing artwork.
  'e07a994f-50a7-41ed-adb4-0c5f4aaef98b.jpg': [
    region(736, 736, [[181, 198], [218, 196], [218, 257], [181, 257]]),
    region(736, 736, [[319, 214], [351, 211], [351, 284], [319, 285]]),
    region(736, 736, [[514, 132], [569, 128], [569, 216], [514, 216]]),
    region(736, 736, [[158, 401], [203, 401], [203, 465], [157, 465]]),
    region(736, 736, [[214, 534], [259, 534], [252, 601], [208, 601]]),
    region(736, 736, [[303, 480], [383, 482], [373, 586], [292, 576]]),
    region(736, 736, [[534, 546], [577, 547], [575, 604], [532, 603]]),
    region(736, 736, [[70, 574], [147, 579], [130, 609], [49, 604]]),
  ],
  // Detail photographs expose only part of an opening; clip to that visible area.
  'f9f07901-3b94-4dad-bbf7-5dd7a17200f1.png': [region(308, 302, [[155, 70], [229, 109], [155, 168], [119, 135]])],
  '1dd475bd-c79b-4fcf-bce8-330edb3d01d0.png': [region(296, 305, [[1, 5], [174, 5], [155, 81], [123, 118], [1, 59]])],
};

export const getFrameOpening = (image: string) => openings[image.split(/[?#]/)[0].split('/').pop() ?? ''];
