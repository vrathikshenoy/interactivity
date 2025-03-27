import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

const Bg = ({ imageUrl }) => {
  const shapes = useMemo(() =>
    Array.from({ length: 8 }).map((_, index) => ({
      id: index,
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100),
      size: Math.floor(Math.random() * 100 + 50),
      delay: Math.floor(Math.random() * 2 * 1000) / 1000
    })),
    []
  )

  const icons = [
    // Left-side icons (Existing ones)
    { src: "/rocket_icon.svg", alt: "Rocket icon", mobileClass: "circle-icon top-0 left-[171px] md:top-28 md:left-72", desktopClass: "hidden md:block md:circle-icon md:top-28 md:left-72" },
    { src: "/bracket_icon.svg", alt: "Bracket icon", mobileClass: "circle-icon top-[162px] -left-5 md:top-64 md:left-0", desktopClass: "hidden md:block md:circle-icon md:top-64 md:left-0" },
    { src: "/github_icon.svg", alt: "Github icon", mobileClass: "circle-icon top-60 left-[149px] md:top-[570px] md:left-44", desktopClass: "hidden md:block md:circle-icon md:top-[570px] md:left-44" },
    { src: "/electricity_icon.svg", alt: "Electricity icon", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[592px] md:left-[608px]" },
    { src: "/merge_icon.svg", alt: "Merge icon", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[158px] md:left-[606px]" },
    { src: "/stack_icon.svg", alt: "Stack icon", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[368px] md:left-[965px]" },

    // Right-side icons (New ones)
    { src: "/lightbulb_icon.svg", alt: "Lightbulb icon (Ideas)", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[80px] md:right-[160px]" },
    { src: "/book_icon.svg", alt: "Book icon (Education)", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[260px] md:right-[80px]" },
    { src: "/code_icon.svg", alt: "Code icon (Programming)", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[420px] md:right-[200px]" },
    { src: "/graph_icon.svg", alt: "Graph icon (Analytics)", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[580px] md:right-[140px]" },
    { src: "/certificate_icon.svg", alt: "Certificate icon (Achievement)", mobileClass: "hidden", desktopClass: "hidden md:block md:circle-icon md:top-[700px] md:right-[50px]" }
  ]

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${imageUrl})`,
            filter: 'brightness(0.6)'
          }}
        />
      )}

      <div className="absolute inset-0 bg-gray-900 bg-opacity-50">
        {shapes.map((shape) => (
          <motion.div
            key={shape.id}
            className="absolute bg-opacity-20 rounded-full"
            style={{
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))'
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ delay: shape.delay, duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 10px)',
          backgroundSize: '10px 10px'
        }}
      />

      {icons.map((icon, index) => (
        <div key={index} className={`absolute ${icon.mobileClass} ${icon.desktopClass}`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.8, 1, 0.8], y: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: index * 0.5, ease: "easeInOut" }}
            style={{
              filter: 'drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.6))'
            }}
          >
            <Image src={icon.src} alt={icon.alt} width={32} height={32} />
          </motion.div>
        </div>
      ))}
    </div>
  )
}

export default Bg
