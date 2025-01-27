import Image from "next/image";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <section className="hidden w-1/2 items-center justify-center bg-brand p-10 lg:flex xl:w-2/5">
        <div className="flex max-h-[800px] max-w-[430px] flex-col justify-center space-y-12">
          <div className="flex items-center gap-2">
            <Image
              src="/cloudstashlogo.svg"
              alt="logo"
              width={100}
              height={100}
              className="h-auto"
            />
            <h1 className="h1 font-poppins text-white"> CloudStash</h1>
          </div>
          <div className="space-y-5 text-white">
            <h1 className="h1">Manage your files the best way</h1>
            <p className="body-1">
              Want to store your documents digitally? You've come to the right
              place.
            </p>
          </div>
          <Image
            src="/assets/images/personfiles.webp"
            alt="Files"
            width={370}
            height={370}
            className="transition-all hover:rotate-2 hover:scale-10"
          />
        </div>
      </section>
      <section className="flex flex-1 flex-col items-center bg-white p-4 py-10 lg:justify-center lg:p-10 lg:py-0">
        <div className="mb-16 lg:hidden">
          <Image
            src="/cloudstashlogosec.svg"
            alt="logo"
            width={100}
            height={100}
            className="h-auto w-[200px] lg:w-[250px]"
          />
          <h1 className="h1 font-poppins text-brand"> CloudStash</h1>
        </div>

        {children}
      </section>
    </div>
  );
};

export default Layout;
