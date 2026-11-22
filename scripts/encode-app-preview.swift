#!/usr/bin/env swift
import AVFoundation
import CoreGraphics
import CoreMedia
import CoreVideo
import Foundation
import ImageIO

// Usage: swift scripts/encode-app-preview.swift <frames_dir> <frame_count> <aac_m4a_path> <output_mp4_path>
guard CommandLine.arguments.count == 5 else {
    fputs("Usage: encode-app-preview.swift <frames_dir> <frame_count> <aac_m4a> <output_mp4>\n", stderr)
    exit(1)
}

let framesDir = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
guard let frameCount = Int(CommandLine.arguments[2]), frameCount > 0 else {
    fputs("Invalid frame_count\n", stderr)
    exit(1)
}
let audioM4AURL = URL(fileURLWithPath: CommandLine.arguments[3])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[4])

let width = 886
let height = 1920
let fps: Int32 = 30

let tempVideoURL = outputURL.deletingLastPathComponent().appendingPathComponent("_temp_video_only.mp4")
try? FileManager.default.removeItem(at: tempVideoURL)
try? FileManager.default.removeItem(at: outputURL)

// --- Step 1: Encode 886x1920 H.264 High Profile @ 30 fps, ~10.5 Mbps ---
let writer = try AVAssetWriter(outputURL: tempVideoURL, fileType: .mp4)

let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoColorPropertiesKey: [
        AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
        AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
        AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 10_500_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: fps,
        AVVideoMaxKeyFrameIntervalKey: fps,
    ],
]

let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
videoInput.expectsMediaDataInRealTime = false

let sourcePixelBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: videoInput,
    sourcePixelBufferAttributes: sourcePixelBufferAttributes
)
precondition(writer.canAdd(videoInput), "Cannot add video input")
writer.add(videoInput)

func makePixelBuffer(from imageURL: URL, pool: CVPixelBufferPool) -> CVPixelBuffer? {
    guard let src = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(src, 0, nil)
    else { return nil }

    var pbOut: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pbOut)
    guard status == kCVReturnSuccess, let pb = pbOut else { return nil }

    CVPixelBufferLockBaseAddress(pb, [])
    defer { CVPixelBufferUnlockBaseAddress(pb, []) }

    guard let baseAddress = CVPixelBufferGetBaseAddress(pb) else { return nil }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(pb)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) else { return nil }

    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pb
}

guard writer.startWriting() else {
    fputs("Failed to start writing video: \(String(describing: writer.error))\n", stderr)
    exit(1)
}
writer.startSession(atSourceTime: .zero)

let group = DispatchGroup()
group.enter()
let videoQueue = DispatchQueue(label: "video.encode.queue")
var currentVideoFrame = 0
videoInput.requestMediaDataWhenReady(on: videoQueue) {
    while videoInput.isReadyForMoreMediaData && currentVideoFrame < frameCount {
        autoreleasepool {
            let name = String(format: "frame-%04d.jpg", currentVideoFrame)
            let url = framesDir.appendingPathComponent(name)
            guard let pool = adaptor.pixelBufferPool,
                  let pb = makePixelBuffer(from: url, pool: pool)
            else {
                fputs("Failed reading frame \(currentVideoFrame)\n", stderr)
                exit(1)
            }
            let pts = CMTime(value: CMTimeValue(currentVideoFrame), timescale: fps)
            if !adaptor.append(pb, withPresentationTime: pts) {
                fputs("Failed appending frame \(currentVideoFrame): \(String(describing: writer.error))\n", stderr)
                exit(1)
            }
            currentVideoFrame += 1
        }
    }
    if currentVideoFrame >= frameCount {
        videoInput.markAsFinished()
        group.leave()
    }
}
group.wait()

let finishSem = DispatchSemaphore(value: 0)
writer.finishWriting { finishSem.signal() }
finishSem.wait()

guard writer.status == .completed else {
    fputs("Video writer failed: \(String(describing: writer.error))\n", stderr)
    exit(1)
}

// --- Step 2: Mux H.264 video + 256kbps Stereo AAC audio into final .mp4 via Passthrough ---
let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: tempVideoURL)
let audioAsset = AVURLAsset(url: audioM4AURL)

let targetDuration = CMTime(value: CMTimeValue(frameCount), timescale: fps)
let timeRange = CMTimeRange(start: .zero, duration: targetDuration)

guard let srcVideoTrack = videoAsset.tracks(withMediaType: .video).first,
      let compVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
else {
    fputs("Missing video track\n", stderr)
    exit(1)
}
try compVideoTrack.insertTimeRange(timeRange, of: srcVideoTrack, at: .zero)

guard let srcAudioTrack = audioAsset.tracks(withMediaType: .audio).first,
      let compAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
else {
    fputs("Missing audio track\n", stderr)
    exit(1)
}
let audioRange = CMTimeRange(start: .zero, duration: min(targetDuration, audioAsset.duration))
try compAudioTrack.insertTimeRange(audioRange, of: srcAudioTrack, at: .zero)

guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough) else {
    fputs("Could not create AVAssetExportSession\n", stderr)
    exit(1)
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true

let expSem = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { expSem.signal() }
expSem.wait()

try? FileManager.default.removeItem(at: tempVideoURL)

guard exporter.status == .completed else {
    fputs("Export mux failed: \(String(describing: exporter.error))\n", stderr)
    exit(1)
}

print("Successfully encoded App Preview MP4: \(outputURL.path)")
