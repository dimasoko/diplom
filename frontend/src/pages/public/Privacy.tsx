export default function Privacy() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-5xl text-primary">Политика конфиденциальности</h1>

      <div className="space-y-4 text-base leading-7 text-text-main">
        <p>
          Мы собираем только данные, необходимые для работы сервиса:{' '}
          <mark className="rounded bg-primary/20 px-1 text-primary">имя</mark>,{' '}
          <mark className="rounded bg-primary/20 px-1 text-primary">телефон</mark> и{' '}
          <mark className="rounded bg-primary/20 px-1 text-primary">историю заказов</mark>.
        </p>

        <p>
          Данные используются для оформления предзаказов, начисления{' '}
          <mark className="rounded bg-primary/20 px-1 text-primary">бонусов</mark> и улучшения качества сервиса.
        </p>

        <p>
          Мы не передаем персональные данные третьим лицам, кроме случаев, предусмотренных{' '}
          <mark className="rounded bg-primary/20 px-1 text-primary">законодательством</mark>.
        </p>

        <p>
          Пользователь может запросить удаление аккаунта и персональных данных через обращение в службу поддержки.
        </p>
      </div>
    </section>
  )
}
