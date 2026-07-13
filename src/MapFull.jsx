import React, { useState, useEffect } from "react";
import ModalAgree from "./ModalAgree";
import RainMap from "./RainMap";

export default function MapFull() {
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("agree")) {
      setShowModal(false);
    }
  }, []);

  const handleAgree = () => {
    sessionStorage.setItem("agree", "true");
    setShowModal(false);
  };

  return (
    <>
      {showModal && <ModalAgree onAgree={handleAgree} />}
      {!showModal && <RainMap />}
    </>
  );
}
