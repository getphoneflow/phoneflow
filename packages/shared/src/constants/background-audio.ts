export const BACKGROUND_AUDIO = {
  "call-center": {
    name: "Call center",
    source: "background/call-center.mp3",
  },
  "coffe-shop": {
    name: "Coffee shop",
    source: "background/coffe-shop.mp3",
  },
  office: {
    name: "Office",
    source: "background/office.mp3",
  },
  reception: {
    name: "Reception",
    source: "background/reception.mp3",
  },
  street: {
    name: "Street",
    source: "background/street.mp3",
  },
}

export const BACKGROUND_AUDIO_IDS = Object.keys(
  BACKGROUND_AUDIO
) as (keyof typeof BACKGROUND_AUDIO)[]
