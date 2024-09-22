module.exports = async function (taskArgs, hre, runSuper) {
    try {
        // Проверка, что все необходимые аргументы переданы
        if (!taskArgs.endpoint || !ethers.utils.isAddress(taskArgs.endpoint)) {
            throw new Error("Неверный или отсутствующий адрес endpoint.");
        }

        if (!taskArgs.ua || !ethers.utils.isAddress(taskArgs.ua)) {
            throw new Error("Неверный или отсутствующий адрес user application.");
        }

        // Получаем контракт Endpoint
        let Endpoint = await ethers.getContractFactory("Endpoint");
        let endpoint = await Endpoint.attach(taskArgs.endpoint);

        // Оценка комиссии
        let estimatedFees = await endpoint.estimateFees(
            taskArgs.dstChainId,
            taskArgs.ua,
            taskArgs.payload,
            false, // payInZro
            taskArgs.relayerParams
        );

        // Форматируем и выводим оценочные комиссии в удобном виде (например, в ETH)
        let formattedFees = ethers.utils.formatEther(estimatedFees[0]);  // Преобразуем wei в ETH
        console.log(`Оценочные комиссии для цепочки ${taskArgs.dstChainId}: ${formattedFees} ETH`);

    } catch (error) {
        // Обрабатываем ошибки и выводим их в консоль
        console.error("Произошла ошибка при оценке комиссий:", error.message);
    }
};
