import Lottie from 'lottie-react'
import loadingAnimation from '../../assets/animations/loading.json'

export default function LottieLoader({ className = 'w-28 h-28 mx-auto', label = 'Loading...' }) {
  return (
    <div className="py-8 text-center">
      <Lottie animationData={loadingAnimation} loop className={className} />
      {label && <p className="text-sm text-gray-400 mt-1">{label}</p>}
    </div>
  )
}
